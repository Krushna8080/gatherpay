import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, elevation, borderRadius } from '../../theme';

interface CardProps {
  style?: ViewStyle;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
  onPress?: () => void;
  gradient?: boolean;
}

export function Card({ 
  style, 
  children, 
  variant = 'primary',
  onPress,
  gradient = false
}: CardProps) {
  const cardColor = colors.card[variant];
  const gradientColors = colors.gradient[variant] || colors.gradient.primary;

  const CardContainer = gradient ? LinearGradient : View;
  const containerProps = gradient ? {
    colors: gradientColors,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 }
  } : {};

  const content = (
    <CardContainer 
      style={[
        styles.container,
        !gradient && { backgroundColor: cardColor },
        style
      ]}
      {...containerProps}
    >
      {children}
    </CardContainer>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: borderRadius.lg,
    ...elevation.medium,
  },
}); 