import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing } from '../../theme';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info';
  text: string;
  size?: 'small' | 'medium' | 'large';
}

export function StatusBadge({ status, text, size = 'medium' }: StatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return colors.success || '#4CAF50';
      case 'warning':
        return colors.notification;
      case 'error':
        return colors.error;
      case 'info':
        return colors.primary;
      default:
        return colors.disabled;
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
        {text}
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