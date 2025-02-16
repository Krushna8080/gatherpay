import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  runTransaction,
} from 'firebase/firestore';
import { FIREBASE_TEST_NUMBERS } from '../utils/testData';

interface WalletContextType {
  balance: number;
  rewardCoins: number;
  transactions: Transaction[];
  loading: boolean;
  addMoney: (amount: number, description?: string) => Promise<void>;
  deductMoney: (amount: number, description: string) => Promise<void>;
  addRewardCoins: (amount: number) => Promise<void>;
  refreshWallet: () => Promise<void>;
  transferMoney: (toUserId: string, amount: number, description: string) => Promise<void>;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit' | 'transfer_in' | 'transfer_out';
  amount: number;
  description: string;
  timestamp: Date;
  userId: string;
  fromUserId?: string;
  toUserId?: string;
  groupId?: string;
  orderId?: string;
  status: 'pending' | 'completed' | 'failed';
  failureReason?: string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const MIN_TRANSACTION_AMOUNT = 1;
const MAX_TRANSACTION_AMOUNT = 10000;
const MAX_DAILY_TRANSACTION_LIMIT = 50000;

class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletError';
  }
}

const isTestUser = (phoneNumber: string | null) => {
  return FIREBASE_TEST_NUMBERS.some(testUser => testUser.phoneNumber === phoneNumber);
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [rewardCoins, setRewardCoins] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      refreshWallet();
    }
  }, [user]);

  const validateTransactionAmount = (amount: number) => {
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid transaction amount');
    }
    if (amount < MIN_TRANSACTION_AMOUNT) {
      throw new Error(`Minimum transaction amount is ₹${MIN_TRANSACTION_AMOUNT}`);
    }
    if (amount > MAX_TRANSACTION_AMOUNT) {
      throw new Error(`Maximum transaction amount is ₹${MAX_TRANSACTION_AMOUNT}`);
    }
  };

  const checkDailyLimit = async (userId: string, amount: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef,
      where('userId', '==', userId),
      where('timestamp', '>=', today),
      where('type', 'in', ['credit', 'debit', 'transfer_out'])
    );

    const querySnapshot = await getDocs(q);
    const dailyTotal = querySnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (data.amount || 0);
    }, 0);

    if (dailyTotal + amount > MAX_DAILY_TRANSACTION_LIMIT) {
      throw new Error(`Daily transaction limit of ₹${MAX_DAILY_TRANSACTION_LIMIT} exceeded`);
    }
  };

  const refreshWallet = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setBalance(userData.wallet.balance);
        setRewardCoins(userData.wallet.rewardCoins);
      }

      // Fetch recent transactions
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const transactionList: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        transactionList.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate(),
        } as Transaction);
      });

      setTransactions(transactionList);
    } catch (error) {
      console.error('Error refreshing wallet:', error);
      Alert.alert('Error', 'Failed to refresh wallet data');
    } finally {
      setLoading(false);
    }
  };

  const addMoney = async (amount: number, description: string = 'Added money to wallet') => {
    if (!user) throw new WalletError('No user logged in');

    try {
      validateTransactionAmount(amount);
      await checkDailyLimit(user.uid, amount);

      // Skip payment gateway for test users
      const isTestAccount = isTestUser(user.phoneNumber);
      if (!isTestAccount) {
        // TODO: Integrate actual payment gateway
        throw new WalletError('Direct wallet funding is only available for test users');
      }

      await runTransaction(db, async (transaction) => {
        // Create pending transaction first
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          type: 'credit',
          amount,
          description: isTestAccount ? `${description} (Test User)` : description,
          timestamp: serverTimestamp(),
          userId: user.uid,
          status: 'pending',
          isTestTransaction: isTestAccount
        });

        try {
          // Update wallet balance
          const userRef = doc(db, 'users', user.uid);
          transaction.update(userRef, {
            'wallet.balance': increment(amount)
          });

          // Update transaction status to completed
          transaction.update(transactionRef, {
            status: 'completed'
          });
        } catch (err) {
          const error = err as Error;
          transaction.update(transactionRef, {
            status: 'failed',
            failureReason: error.message || 'Unknown error occurred'
          });
          throw new WalletError(error.message || 'Failed to process transaction');
        }
      });

      await refreshWallet();
      Alert.alert('Success', `₹${amount} added to your wallet`);
    } catch (err) {
      const error = err as Error;
      console.error('Error adding money:', error);
      Alert.alert('Error', error.message || 'Failed to add money');
      throw new WalletError(error.message || 'Failed to add money');
    }
  };

  const deductMoney = async (amount: number, description: string) => {
    if (!user) throw new WalletError('No user logged in');
    
    try {
      validateTransactionAmount(amount);
      if (balance < amount) {
        throw new WalletError('Insufficient balance');
      }

      await runTransaction(db, async (transaction) => {
        // Create pending transaction first
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          type: 'debit',
          amount,
          description,
          timestamp: serverTimestamp(),
          userId: user.uid,
          status: 'pending'
        });

        try {
          // Update wallet balance
          const userRef = doc(db, 'users', user.uid);
          transaction.update(userRef, {
            'wallet.balance': increment(-amount)
          });

          // Update transaction status to completed
          transaction.update(transactionRef, {
            status: 'completed'
          });
        } catch (err) {
          // If anything fails, mark transaction as failed
          const error = err as Error;
          transaction.update(transactionRef, {
            status: 'failed',
            failureReason: error.message || 'Unknown error occurred'
          });
          throw new WalletError(error.message || 'Failed to process transaction');
        }
      });

      await refreshWallet();
    } catch (err) {
      const error = err as Error;
      console.error('Error deducting money:', error);
      Alert.alert('Error', error.message || 'Failed to deduct money');
      throw new WalletError(error.message || 'Failed to deduct money');
    }
  };

  const transferMoney = async (toUserId: string, amount: number, description: string) => {
    if (!user) throw new WalletError('No user logged in');
    if (user.uid === toUserId) throw new WalletError('Cannot transfer money to yourself');

    try {
      validateTransactionAmount(amount);
      await checkDailyLimit(user.uid, amount);
      if (balance < amount) {
        throw new WalletError('Insufficient balance');
      }

      await runTransaction(db, async (transaction) => {
        // Verify recipient exists
        const recipientRef = doc(db, 'users', toUserId);
        const recipientDoc = await transaction.get(recipientRef);
        if (!recipientDoc.exists()) {
          throw new WalletError('Recipient not found');
        }

        // Create pending transactions for both users
        const senderTransactionRef = doc(collection(db, 'transactions'));
        const recipientTransactionRef = doc(collection(db, 'transactions'));

        // Sender's transaction
        transaction.set(senderTransactionRef, {
          type: 'transfer_out',
          amount,
          description,
          timestamp: serverTimestamp(),
          userId: user.uid,
          toUserId,
          status: 'pending'
        });

        // Recipient's transaction
        transaction.set(recipientTransactionRef, {
          type: 'transfer_in',
          amount,
          description,
          timestamp: serverTimestamp(),
          userId: toUserId,
          fromUserId: user.uid,
          status: 'pending'
        });

        try {
          // Update both wallets
          const senderRef = doc(db, 'users', user.uid);
          transaction.update(senderRef, {
            'wallet.balance': increment(-amount)
          });

          transaction.update(recipientRef, {
            'wallet.balance': increment(amount)
          });

          // Mark both transactions as completed
          transaction.update(senderTransactionRef, { status: 'completed' });
          transaction.update(recipientTransactionRef, { status: 'completed' });
        } catch (err) {
          // Mark both transactions as failed
          const error = err as Error;
          transaction.update(senderTransactionRef, {
            status: 'failed',
            failureReason: error.message || 'Unknown error occurred'
          });
          transaction.update(recipientTransactionRef, {
            status: 'failed',
            failureReason: error.message || 'Unknown error occurred'
          });
          throw new WalletError(error.message || 'Failed to process transaction');
        }
      });

      await refreshWallet();
      Alert.alert('Success', `₹${amount} transferred successfully`);
    } catch (err) {
      const error = err as Error;
      console.error('Error transferring money:', error);
      Alert.alert('Error', error.message || 'Failed to transfer money');
      throw new WalletError(error.message || 'Failed to transfer money');
    }
  };

  const addRewardCoins = async (amount: number) => {
    if (!user) throw new WalletError('No user logged in');

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'wallet.rewardCoins': increment(amount)
      });

      await refreshWallet();
    } catch (err) {
      const error = err as Error;
      console.error('Error adding reward coins:', error);
      Alert.alert('Error', 'Failed to add reward coins');
      throw new WalletError(error.message || 'Failed to add reward coins');
    }
  };

  const value = {
    balance,
    rewardCoins,
    transactions,
    loading,
    addMoney,
    deductMoney,
    addRewardCoins,
    refreshWallet,
    transferMoney,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}