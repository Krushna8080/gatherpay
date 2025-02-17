import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, elevation } from '../../theme';

interface CategoryButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
  style?: any;
}

export function CategoryButton({ 
  icon, 
  label, 
  onPress, 
  variant = 'primary',
  style
}: CategoryButtonProps) {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'accent':
        return colors.warning;
      default:
        return colors.primary;
    }
  };

  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.container, style]}
      activeOpacity={0.9}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: getBackgroundColor() }
      ]}>
        <MaterialCommunityIcons 
          name={icon} 
          size={24} 
          color={colors.background}
        />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.sm,
    ...elevation.small,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
}); 