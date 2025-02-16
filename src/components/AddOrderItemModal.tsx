import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, TextInput, Button } from 'react-native-paper';
import { colors, spacing } from '../theme';

interface AddOrderItemModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (items: string, amount: number) => Promise<void>;
}

export default function AddOrderItemModal({
  visible,
  onDismiss,
  onSubmit,
}: AddOrderItemModalProps) {
  const [items, setItems] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!items || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    try {
      setLoading(true);
      await onSubmit(items, amountNum);
      setItems('');
      setAmount('');
      onDismiss();
    } catch (error) {
      console.error('Error submitting order items:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Text variant="headlineSmall" style={styles.title}>
          Add Your Order
        </Text>
        <ScrollView>
          <TextInput
            mode="outlined"
            label="Items (e.g., 1x Burger, 2x Fries)"
            value={items}
            onChangeText={setItems}
            multiline
            numberOfLines={3}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            left={<TextInput.Affix text="₹" />}
            style={styles.input}
          />
        </ScrollView>
        <View style={styles.buttons}>
          <Button
            mode="outlined"
            onPress={onDismiss}
            style={styles.button}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.button}
            loading={loading}
            disabled={loading || !items || !amount}
          >
            Add to Order
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: 8,
    maxHeight: '80%',
  },
  title: {
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  button: {
    minWidth: 100,
  },
}); 