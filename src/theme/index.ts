import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const colors = {
  primary: '#00C853', // Main green color
  primaryDark: '#00A040',
  primaryLight: '#5EFF82',
  secondary: '#1976D2', // Blue color for secondary actions
  secondaryDark: '#004BA0',
  secondaryLight: '#63A4FF',
  error: '#FF3D00',
  success: '#00E676',
  warning: '#FFC400',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  text: '#1A1A1A',
  textSecondary: '#757575',
  disabled: '#BDBDBD',
  placeholder: '#9E9E9E',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#FF9800',
  card: {
    primary: '#00C853',
    secondary: '#1976D2',
    accent: '#FFC400',
  },
  gradient: {
    primary: ['#00C853', '#00A040'],
    secondary: ['#1976D2', '#004BA0'],
    success: ['#00E676', '#00C853'],
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
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.37,
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