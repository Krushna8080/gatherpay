import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Card } from './Card';
import { AnimatedNumber } from './AnimatedNumber';
import { colors, spacing } from '../../theme';

interface BalanceCardProps {
  balance: number;
  title: string;
  subtitle?: string;
  variant?: 'primary' | 'secondary';
  onPress?: () => void;
}

export function BalanceCard({
  balance,
  title,
  subtitle,
  variant = 'primary',
  onPress
}: BalanceCardProps) {
  return (
    <Card 
      variant={variant}
      gradient
      onPress={onPress}
      style={styles.container}
    >
      <Text style={styles.title}>{title}</Text>
      <View style={styles.balanceContainer}>
        <Text style={styles.currencySymbol}>₹</Text>
        <AnimatedNumber
          value={balance}
          style={styles.balance}
          formatter={(val) => val.toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0
          })}
        />
      </View>
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  title: {
    color: colors.background,
    opacity: 0.9,
    fontSize: 14,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  currencySymbol: {
    color: colors.background,
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: spacing.xs,
  },
  balance: {
    color: colors.background,
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    color: colors.background,
    opacity: 0.8,
    fontSize: 12,
    marginTop: spacing.sm,
  },
}); 