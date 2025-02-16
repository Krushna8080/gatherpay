import React, { useEffect } from 'react';
import { Text, TextStyle, Animated } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle;
  formatter?: (value: number) => string;
  duration?: number;
}

export function AnimatedNumber({
  value,
  style,
  formatter = (val) => val.toString(),
  duration = 500,
}: AnimatedNumberProps) {
  const animatedValue = new Animated.Value(0);
  const [displayValue, setDisplayValue] = React.useState(formatter(value));

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();

    const listener = animatedValue.addListener(({ value: val }) => {
      setDisplayValue(formatter(val));
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value, formatter, duration]);

  return (
    <Text style={style}>
      {displayValue}
    </Text>
  );
} 