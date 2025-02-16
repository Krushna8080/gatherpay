import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle, Platform, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, elevation } from '../../theme';

interface CategoryButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
  style?: ViewStyle;
  disabled?: boolean;
}

export function CategoryButton({
  icon,
  label,
  onPress,
  variant = 'primary',
  style,
  disabled = false,
}: CategoryButtonProps) {
  const gradientColors = colors.gradient[variant] || colors.gradient.primary;

  // For web, use a regular View with backgroundColor if LinearGradient is not supported
  if (Platform.OS === 'web') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        style={[styles.container, style]}
        activeOpacity={0.8}
      >
        <View style={[styles.gradient, { backgroundColor: gradientColors[0] }]}>
          <MaterialCommunityIcons
            name={icon}
            size={24}
            color={colors.background}
            style={styles.icon}
          />
          <Text style={styles.label}>{label}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, style]}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <MaterialCommunityIcons
          name={icon}
          size={24}
          color={colors.background}
          style={styles.icon}
        />
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    ...elevation.small,
  },
  gradient: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    minHeight: 100,
  },
  icon: {
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 