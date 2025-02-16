import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, List, IconButton, Portal, Modal, TextInput } from 'react-native-paper';
import { useWallet } from '../../contexts/WalletContext';
import { colors, spacing } from '../../theme';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
      <Card style={styles.balanceCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.balanceTitle}>Wallet Balance</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <AnimatedNumber
              value={balance}
              style={styles.balanceAmount}
            />
          </View>
          
          <View style={styles.rewardContainer}>
            <Text variant="titleMedium">Reward Coins</Text>
            <AnimatedNumber
              value={rewardCoins}
              style={styles.rewardAmount}
            />
          </View>
        </Card.Content>
      </Card>

      <View style={styles.actionButtons}>
        <Button
          mode="contained"
          onPress={() => setShowAddFundsModal(true)}
          style={styles.actionButton}
          icon="wallet-plus"
        >
          Add Funds
        </Button>
        <Button
          mode="contained"
          onPress={() => Alert.alert('Coming Soon', 'Withdraw feature will be available soon!')}
          style={styles.actionButton}
          icon="wallet-giftcard"
        >
          Withdraw
        </Button>
      </View>

      <View style={styles.transactionsHeader}>
        <Text variant="titleLarge">Recent Transactions</Text>
        <View style={styles.transactionActions}>
          <IconButton
            icon="export"
            size={24}
            onPress={handleExportTransactions}
          />
          <IconButton
            icon="refresh"
            size={24}
            onPress={() => refreshWallet()}
          />
        </View>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
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
        </View>
      ) : (
        <View style={styles.transactionsList}>
          {transactions.map((transaction) => (
            <List.Item
              key={transaction.id}
              title={transaction.description}
              description={new Date(transaction.timestamp).toLocaleDateString()}
              left={props => (
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
            />
          ))}
        </View>
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
    margin: spacing.lg,
    backgroundColor: colors.primary,
  },
  balanceTitle: {
    color: colors.surface,
    textAlign: 'center',
    marginBottom: spacing.sm,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 8,
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
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  transactionActions: {
    flexDirection: 'row',
  },
  transactionsList: {
    backgroundColor: colors.surface,
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