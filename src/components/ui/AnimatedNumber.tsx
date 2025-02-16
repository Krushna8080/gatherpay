import React, { useEffect, useRef } from 'react';
import { Text, Animated, StyleSheet, TextStyle } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: TextStyle;
  formatter?: (value: number) => string;
}

export function AnimatedNumber({
  value,
  duration = 500,
  prefix = '',
  suffix = '',
  style,
  formatter = (val) => val.toFixed(2),
}: AnimatedNumberProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      Animated.timing(animatedValue, {
        toValue: value,
        duration,
        useNativeDriver: false,
      }).start();
      prevValue.current = value;
    }
  }, [value, duration, animatedValue]);

  const animatedText = animatedValue.interpolate({
    inputRange: [0, value],
    outputRange: [0, value],
  });

  return (
    <Animated.Text style={[styles.text, style]}>
    {prefix}
    {animatedText.interpolate({
      inputRange: [0, value],
      outputRange: [formatter(0), formatter(value)],
    }).toString()} // Convert to string
    {suffix}
  </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
}); 