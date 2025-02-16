import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'information' | 'alert' | 'cash' | 'account' | 'message' | 'cart' | 'star';
  action?: {
    label: string;
    onPress: () => void;
  };
  variant?: 'fullscreen' | 'compact';
}

export function EmptyState({
  title,
  description,
  icon = 'information',
  action,
  variant = 'compact',
}: EmptyStateProps) {
  const containerStyle = [
    styles.container,
    variant === 'fullscreen' ? styles.fullscreen : styles.compact,
  ];

  return (
    <View style={containerStyle}>
      <MaterialCommunityIcons
        name={icon}
        size={variant === 'fullscreen' ? 80 : 60}
        color={colors.disabled}
        style={styles.icon}
      />

      <Text
        variant={variant === 'fullscreen' ? 'headlineMedium' : 'titleLarge'}
        style={styles.title}
      >
        {title}
      </Text>

      <Text
        variant={variant === 'fullscreen' ? 'bodyLarge' : 'bodyMedium'}
        style={styles.description}
      >
        {description}
      </Text>

      {action && (
        <Button
          mode="contained"
          onPress={action.onPress}
          style={styles.button}
        >
          {action.label}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  compact: {
    paddingVertical: spacing.xl,
  },
  icon: {
    marginBottom: spacing.lg,
    opacity: 0.8,
  },
  title: {
    textAlign: 'center',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  description: {
    textAlign: 'center',
    color: colors.disabled,
    marginBottom: spacing.lg,
  },
  button: {
    minWidth: 200,
  },
}); 