import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { colors, spacing, elevation } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedNumber } from './AnimatedNumber';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface BalanceCardProps {
  title: string;
  balance: number;
  subtitle: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  style?: any;
}

export function BalanceCard({ 
  title, 
  balance, 
  subtitle, 
  onPress, 
  variant = 'primary',
  style 
}: BalanceCardProps) {
  const gradientColors = variant === 'primary' 
    ? colors.gradient.purple
    : colors.gradient.blue;

  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.container, style]}
      activeOpacity={0.95}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.pattern}>
          <View style={[styles.patternCircle, styles.circle1]} />
          <View style={[styles.patternCircle, styles.circle2]} />
          <View style={[styles.patternCircle, styles.circle3]} />
        </View>
        
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <MaterialCommunityIcons 
                name={variant === 'primary' ? 'wallet' : 'gift'} 
                size={20} 
                color={colors.background}
                style={styles.icon}
              />
              <Text style={styles.title}>{title}</Text>
            </View>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={24} 
              color={colors.background}
              style={styles.chevron}
            />
          </View>
          
          <View style={styles.balanceContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <AnimatedNumber
              value={balance}
              style={styles.balance}
            />
          </View>
          
          <View style={styles.subtitleContainer}>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    width: width - spacing.lg * 2,
    ...elevation.medium,
  },
  gradient: {
    minHeight: 160,
  },
  pattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  patternCircle: {
    position: 'absolute',
    backgroundColor: colors.background,
    borderRadius: 9999,
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -50,
    opacity: 0.08,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: -50,
    left: -30,
    opacity: 0.05,
  },
  circle3: {
    width: 100,
    height: 100,
    top: 20,
    right: 40,
    opacity: 0.07,
  },
  content: {
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.9,
  },
  icon: {
    opacity: 0.9,
  },
  chevron: {
    opacity: 0.7,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  currencySymbol: {
    color: colors.background,
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: spacing.xs,
  },
  balance: {
    color: colors.background,
    fontSize: 40,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    opacity: 0.8,
  },
  subtitle: {
    color: colors.background,
    fontSize: 14,
  },
}); 