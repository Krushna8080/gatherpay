import { db } from '../config/firebase';
import { 
  doc, 
  collection,
  runTransaction,
  serverTimestamp,
  increment,
  writeBatch,
  getDocs,
  query,
  where,
  orderBy,
  limit 
} from 'firebase/firestore';

const PLATFORM_FEE_PERCENTAGE = 2; // 2% platform fee
const NO_SHOW_PENALTY_MINUTES = 10;
const NO_SHOW_PENALTY_PERCENTAGE = 20; // 20% penalty for no-shows
const MAX_BATCH_SIZE = 500; // Firestore batch limit
const MAX_RETRIES = 3;

class OrderProcessingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'OrderProcessingError';
  }
}

interface OrderItem {
  userId: string;
  itemMRP: number;
  finalAmount: number;
  approved: boolean;
  received: boolean;
  receivedAt?: Date;
}

interface OrderSplit {
  userId: string;
  originalAmount: number;
  taxShare: number;
  discountShare: number;
  finalAmount: number;
  approved: boolean;
}

export class OrderProcessor {
  private static async validateOrder(orderId: string, transaction: any) {
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await transaction.get(orderRef);
    
    if (!orderDoc.exists()) {
      throw new OrderProcessingError('Order not found', 'ORDER_NOT_FOUND');
    }

    const orderData = orderDoc.data();
    if (orderData.status === 'completed') {
      throw new OrderProcessingError('Order already completed', 'ORDER_COMPLETED');
    }

    if (orderData.status === 'cancelled') {
      throw new OrderProcessingError('Order was cancelled', 'ORDER_CANCELLED');
    }

    return orderData;
  }

  private static async validateGroupMembers(groupId: string, transaction: any) {
    const groupRef = doc(db, 'groups', groupId);
    const groupDoc = await transaction.get(groupRef);
    
    if (!groupDoc.exists()) {
      throw new OrderProcessingError('Group not found', 'GROUP_NOT_FOUND');
    }

    const groupData = groupDoc.data();
    if (groupData.status !== 'ordered') {
      throw new OrderProcessingError('Invalid group status', 'INVALID_GROUP_STATUS');
    }

    return groupData.members;
  }

  private static async validateUserWallets(members: string[], transaction: any) {
    const walletValidations = await Promise.all(
      members.map(async (userId) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new OrderProcessingError(`User ${userId} not found`, 'USER_NOT_FOUND');
        }

        return {
          userId,
          balance: userDoc.data().wallet.balance
        };
      })
    );

    return walletValidations;
  }

  static async calculateSplit(
    items: OrderItem[],
    totalTax: number,
    totalDiscount: number
  ): Promise<OrderSplit[]> {
    try {
      // Input validation
      if (!Array.isArray(items) || items.length === 0) {
        throw new OrderProcessingError('Invalid items array', 'INVALID_ITEMS');
      }
      if (typeof totalTax !== 'number' || totalTax < 0) {
        throw new OrderProcessingError('Invalid tax amount', 'INVALID_TAX');
      }
      if (typeof totalDiscount !== 'number' || totalDiscount < 0) {
        throw new OrderProcessingError('Invalid discount amount', 'INVALID_DISCOUNT');
      }

      const totalMRP = items.reduce((sum, item) => sum + item.itemMRP, 0);
      if (totalMRP <= 0) {
        throw new OrderProcessingError('Total MRP must be greater than 0', 'INVALID_TOTAL');
      }

      return items.map(item => {
        const ratio = item.itemMRP / totalMRP;
        const taxShare = Number((totalTax * ratio).toFixed(2));
        const discountShare = Number((totalDiscount * ratio).toFixed(2));
        const finalAmount = Number((item.itemMRP + taxShare - discountShare).toFixed(2));
        
        return {
          userId: item.userId,
          originalAmount: item.itemMRP,
          taxShare,
          discountShare,
          finalAmount,
          approved: false
        };
      });
    } catch (error) {
      if (error instanceof OrderProcessingError) {
        throw error;
      }
      throw new OrderProcessingError('Failed to calculate split', 'CALCULATION_ERROR');
    }
  }

  static async processOrderCompletion(
    groupId: string,
    orderId: string,
    leaderId: string,
    splits: OrderSplit[]
  ): Promise<boolean> {
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
      try {
        await runTransaction(db, async (transaction) => {
          // Validate order and group
          const orderData = await this.validateOrder(orderId, transaction);
          const members = await this.validateGroupMembers(groupId, transaction);
          const wallets = await this.validateUserWallets(members, transaction);

          // Verify all splits are approved
          const allApproved = splits.every(split => split.approved);
          if (!allApproved) {
            throw new OrderProcessingError('Not all splits have been approved', 'SPLITS_NOT_APPROVED');
          }

          // Calculate platform fee
          const totalAmount = splits.reduce((sum, split) => sum + split.finalAmount, 0);
          const platformFee = Number((totalAmount * (PLATFORM_FEE_PERCENTAGE / 100)).toFixed(2));

          // Process payments in batches if needed
          const batch = writeBatch(db);
          let operationCount = 0;

          // Process each member's payment
          for (const split of splits) {
            if (split.userId === leaderId) continue;

            const memberWallet = wallets.find(w => w.userId === split.userId);
            if (!memberWallet) {
              throw new OrderProcessingError(`Wallet not found for user ${split.userId}`, 'WALLET_NOT_FOUND');
            }

            if (memberWallet.balance < split.finalAmount) {
              throw new OrderProcessingError(`Insufficient balance for user ${split.userId}`, 'INSUFFICIENT_BALANCE');
            }

            const memberWalletRef = doc(db, 'users', split.userId);
            batch.update(memberWalletRef, {
              'wallet.balance': increment(-split.finalAmount)
            });

            const memberTransactionRef = doc(collection(db, 'transactions'));
            batch.set(memberTransactionRef, {
              type: 'debit',
              amount: split.finalAmount,
              description: `Payment for group order in ${groupId}`,
              timestamp: serverTimestamp(),
              userId: split.userId,
              groupId,
              orderId,
              status: 'completed'
            });

            operationCount += 2;
            if (operationCount >= MAX_BATCH_SIZE) {
              await batch.commit();
              operationCount = 0;
            }
          }

          // Process leader's payment
          const leaderAmount = totalAmount - platformFee;
          const leaderWalletRef = doc(db, 'users', leaderId);
          batch.update(leaderWalletRef, {
            'wallet.balance': increment(leaderAmount)
          });

          const leaderTransactionRef = doc(collection(db, 'transactions'));
          batch.set(leaderTransactionRef, {
            type: 'credit',
            amount: leaderAmount,
            description: `Received payment for group order in ${groupId}`,
            timestamp: serverTimestamp(),
            userId: leaderId,
            groupId,
            orderId,
            status: 'completed',
            platformFee
          });

          // Update order status
          const orderRef = doc(db, 'orders', orderId);
          batch.update(orderRef, {
            status: 'completed',
            completedAt: serverTimestamp(),
            platformFee,
            processedAt: serverTimestamp()
          });

          // Commit final batch
          await batch.commit();

          // Delete group in a separate operation
          await transaction.delete(doc(db, 'groups', groupId));
        });

        return true;
      } catch (error) {
        retryCount++;
        if (retryCount >= MAX_RETRIES || !(error instanceof OrderProcessingError)) {
          throw error;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }

    return false;
  }

  static async processNoShow(
    groupId: string,
    orderId: string,
    userId: string,
    leaderId: string
  ): Promise<boolean> {
    try {
      await runTransaction(db, async (transaction) => {
        // Validate order and user
        const orderData = await this.validateOrder(orderId, transaction);
        const userItem = orderData.items[userId];
        
        if (!userItem) {
          throw new OrderProcessingError('User item not found', 'ITEM_NOT_FOUND');
        }

        if (userItem.noShow) {
          throw new OrderProcessingError('User already marked as no-show', 'ALREADY_NO_SHOW');
        }

        // Calculate penalty
        const penaltyAmount = Number((userItem.finalAmount * (NO_SHOW_PENALTY_PERCENTAGE / 100)).toFixed(2));

        // Validate user wallet
        const [userWallet, leaderWallet] = await this.validateUserWallets([userId, leaderId], transaction);
        if (userWallet.balance < penaltyAmount) {
          throw new OrderProcessingError('Insufficient balance for penalty', 'INSUFFICIENT_BALANCE');
        }

        const batch = writeBatch(db);

        // Deduct penalty from user's wallet
        batch.update(doc(db, 'users', userId), {
          'wallet.balance': increment(-penaltyAmount)
        });

        // Add penalty to leader's wallet
        batch.update(doc(db, 'users', leaderId), {
          'wallet.balance': increment(penaltyAmount)
        });

        // Record penalty transactions
        const transactionsRef = collection(db, 'transactions');
        
        // User penalty deduction
        batch.set(doc(transactionsRef), {
          type: 'debit',
          amount: penaltyAmount,
          description: `No-show penalty for group order in ${groupId}`,
          timestamp: serverTimestamp(),
          userId,
          groupId,
          orderId,
          status: 'completed'
        });

        // Leader penalty receipt
        batch.set(doc(transactionsRef), {
          type: 'credit',
          amount: penaltyAmount,
          description: `Received no-show penalty for group order in ${groupId}`,
          timestamp: serverTimestamp(),
          userId: leaderId,
          groupId,
          orderId,
          status: 'completed'
        });

        // Update order item status
        batch.update(doc(db, 'orders', orderId), {
          [`items.${userId}.noShow`]: true,
          [`items.${userId}.noShowPenalty`]: penaltyAmount,
          [`items.${userId}.noShowTimestamp`]: serverTimestamp()
        });

        await batch.commit();
      });

      return true;
    } catch (error) {
      if (error instanceof OrderProcessingError) {
        throw error;
      }
      throw new OrderProcessingError('Failed to process no-show penalty', 'PROCESSING_ERROR');
    }
  }
} 