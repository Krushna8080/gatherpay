import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const colors = {
  primary: '#6C5CE7', // Main purple color
  primaryDark: '#5849BE',
  primaryLight: '#A8A4E3',
  secondary: '#00B8D4', // Bright blue color
  secondaryDark: '#0091A8',
  secondaryLight: '#64FFDA',
  accent: '#FF7675', // Coral accent
  error: '#FF4757',
  success: '#2ECC71',
  warning: '#FFA502',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F8F9FE',
  text: '#2D3436',
  textSecondary: '#636E72',
  disabled: '#B2BEC3',
  placeholder: '#95A5A6',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#FF9F43',
  card: {
    primary: '#6C5CE7',
    secondary: '#00B8D4',
    accent: '#FF7675',
  },
  gradient: {
    primary: ['#6C5CE7', '#5849BE'],
    secondary: ['#00B8D4', '#0091A8'],
    success: ['#2ECC71', '#27AE60'],
    accent: ['#FF7675', '#D63031'],
    purple: ['#6C5CE7', '#8E44AD'],
    blue: ['#00B8D4', '#0984E3'],
    orange: ['#FF9F43', '#EE5A24']
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
};

export const elevation = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.20,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 7.49,
    elevation: 8,
  },
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...colors,
  },
  roundness: borderRadius.md,
}; 