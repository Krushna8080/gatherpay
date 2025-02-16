import React from 'react';
import { Button as PaperButton } from 'react-native-paper';
import { StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

interface ButtonProps extends React.ComponentProps<typeof PaperButton> {
  fullWidth?: boolean;
}

export function Button({ style, fullWidth, ...props }: ButtonProps) {
  return (
    <PaperButton
      {...props}
      style={[
        styles.button,
        fullWidth && styles.fullWidth,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingVertical: spacing.xs,
  },
  fullWidth: {
    width: '100%',
  },
}); 