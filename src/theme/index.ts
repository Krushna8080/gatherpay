import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const colors = {
  primary: '#2196F3',
  secondary: '#03DAC6',
  error: '#B00020',
  success: '#4CAF50',
  warning: '#FFC107',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#000000',
  disabled: '#757575',
  placeholder: '#9E9E9E',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  notification: '#FF9800',
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...colors,
  },
  roundness: 8,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
}; 