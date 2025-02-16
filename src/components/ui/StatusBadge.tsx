import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '../../theme';

type GroupStatus = 'open' | 'ordering' | 'ordered' | 'completed' | 'cancelled';

interface StatusBadgeProps {
  status: GroupStatus;
  size?: 'small' | 'medium' | 'large';
}

export function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'open':
        return colors.success;
      case 'ordering':
        return colors.primary;
      case 'ordered':
        return colors.secondary;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.disabled;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'open':
        return 'Open to Join';
      case 'ordering':
        return 'Ordering';
      case 'ordered':
        return 'Order Placed';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: spacing.xs / 2,
          paddingHorizontal: spacing.xs,
          fontSize: 10,
        };
      case 'large':
        return {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          fontSize: 14,
        };
      default:
        return {
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          fontSize: 12,
        };
    }
  };

  const badgeSize = getBadgeSize();
  const statusColor = getStatusColor();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: statusColor + '20',
          borderColor: statusColor,
          paddingVertical: badgeSize.paddingVertical,
          paddingHorizontal: badgeSize.paddingHorizontal,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: statusColor,
            fontSize: badgeSize.fontSize,
          },
        ]}
      >
        {getStatusText()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
}); 