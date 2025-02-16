import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, List, IconButton, Portal, Modal, TextInput, Surface } from 'react-native-paper';
import { useWallet } from '../../contexts/WalletContext';
import { colors, spacing } from '../../theme';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function WalletScreen() {
  const { balance, rewardCoins, transactions, addMoney, refreshWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [amount, setAmount] = useState('');

  const handleAddMoney = async () => {
    try {
      setLoading(true);
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }
      await addMoney(amountNum);
      setShowAddFundsModal(false);
      setAmount('');
      Alert.alert('Success', 'Funds added successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add funds');
    } finally {
      setLoading(false);
    }
  };

  const handleExportTransactions = async () => {
    // TODO: Implement transaction export
    Alert.alert('Coming Soon', 'Transaction export feature will be available soon!');
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.balanceCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.balanceContent}>
          <Text variant="titleLarge" style={styles.balanceTitle}>Total Balance</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <AnimatedNumber
              value={balance}
              style={styles.balanceAmount}
            />
          </View>
          
          <Surface style={styles.rewardContainer} elevation={2}>
            <View style={styles.rewardContent}>
              <MaterialCommunityIcons name="gift" size={24} color={colors.primary} />
              <View style={styles.rewardTextContainer}>
                <Text variant="titleMedium" style={styles.rewardTitle}>Reward Coins</Text>
                <AnimatedNumber
                  value={rewardCoins}
                  style={styles.rewardAmount}
                />
              </View>
            </View>
          </Surface>
        </View>
      </LinearGradient>

      <View style={styles.actionButtons}>
        <Button
          mode="contained"
          onPress={() => setShowAddFundsModal(true)}
          style={[styles.actionButton, styles.addFundsButton]}
          icon="wallet-plus"
          contentStyle={styles.buttonContent}
        >
          Add Funds
        </Button>
        <Button
          mode="contained"
          onPress={() => Alert.alert('Coming Soon', 'Withdraw feature will be available soon!')}
          style={[styles.actionButton, styles.withdrawButton]}
          icon="wallet-giftcard"
          contentStyle={styles.buttonContent}
        >
          Withdraw
        </Button>
      </View>

      <View style={styles.transactionsHeader}>
        <Text variant="titleLarge" style={styles.transactionsTitle}>Recent Transactions</Text>
        <View style={styles.transactionActions}>
          <IconButton
            icon="export"
            size={24}
            onPress={handleExportTransactions}
            style={styles.actionIcon}
          />
          <IconButton
            icon="refresh"
            size={24}
            onPress={() => refreshWallet()}
            style={styles.actionIcon}
          />
        </View>
      </View>

      {transactions.length === 0 ? (
        <Surface style={styles.emptyState} elevation={2}>
          <MaterialCommunityIcons
            name="wallet-outline"
            size={64}
            color={colors.disabled}
          />
          <Text variant="titleMedium" style={styles.emptyStateText}>
            No Transactions
          </Text>
          <Text variant="bodyMedium" style={styles.emptyStateSubtext}>
            You haven't made any transactions yet
          </Text>
        </Surface>
      ) : (
        <Surface style={styles.transactionsList} elevation={2}>
          {transactions.map((transaction) => (
            <List.Item
              key={transaction.id}
              title={transaction.description}
              description={new Date(transaction.timestamp).toLocaleDateString()}
              left={props => (
                <View style={[
                  styles.transactionIcon,
                  {
                    backgroundColor: transaction.type === 'credit'
                      ? colors.success + '20'
                      : transaction.type === 'debit'
                      ? colors.error + '20'
                      : colors.primary + '20'
                  }
                ]}>
                  <List.Icon
                    {...props}
                    icon={
                      transaction.type === 'credit'
                        ? 'arrow-down'
                        : transaction.type === 'debit'
                        ? 'arrow-up'
                        : 'swap-horizontal'
                    }
                    color={
                      transaction.type === 'credit'
                        ? colors.success
                        : transaction.type === 'debit'
                        ? colors.error
                        : colors.primary
                    }
                  />
                </View>
              )}
              right={() => (
                <Text
                  style={[
                    styles.transactionAmount,
                    {
                      color:
                        transaction.type === 'credit'
                          ? colors.success
                          : transaction.type === 'debit'
                          ? colors.error
                          : colors.primary,
                    },
                  ]}
                >
                  {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
                </Text>
              )}
              style={styles.transactionItem}
            />
          ))}
        </Surface>
      )}

      <Portal>
        <Modal
          visible={showAddFundsModal}
          onDismiss={() => setShowAddFundsModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Add Funds</Text>
          <TextInput
            mode="outlined"
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            style={styles.input}
            left={<TextInput.Affix text="₹" />}
          />
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setShowAddFundsModal(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleAddMoney}
              loading={loading}
              disabled={loading || !amount}
              style={styles.modalButton}
            >
              Add
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  balanceCard: {
    borderRadius: 20,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  balanceContent: {
    padding: spacing.xl,
  },
  balanceTitle: {
    color: colors.surface,
    textAlign: 'center',
    marginBottom: spacing.sm,
    opacity: 0.9,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: spacing.lg,
  },
  currencySymbol: {
    fontSize: 24,
    color: colors.surface,
    marginRight: spacing.xs,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.surface,
  },
  rewardContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  rewardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  rewardTitle: {
    color: colors.primary,
    opacity: 0.8,
  },
  rewardAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  addFundsButton: {
    backgroundColor: colors.primary,
  },
  withdrawButton: {
    backgroundColor: colors.secondary,
  },
  buttonContent: {
    height: 48,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  transactionsTitle: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  transactionActions: {
    flexDirection: 'row',
  },
  actionIcon: {
    margin: 0,
  },
  transactionsList: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  transactionItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  transactionAmount: {
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl * 2,
    marginHorizontal: spacing.lg,
    borderRadius: 12,
  },
  emptyStateText: {
    marginTop: spacing.md,
    color: colors.disabled,
  },
  emptyStateSubtext: {
    color: colors.disabled,
    textAlign: 'center',
  },
  modal: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalButton: {
    minWidth: 100,
  },
});