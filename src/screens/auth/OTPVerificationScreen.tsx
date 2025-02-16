import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { colors, spacing } from '../../theme';
import { FIREBASE_TEST_NUMBERS, TEST_OTP } from '../../utils/testData';
import { errorHandler } from '../../utils/ErrorHandler';

type OTPVerificationScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'OTPVerification'>;
  route: RouteProp<AuthStackParamList, 'OTPVerification'>;
};
declare const process: {
  env: {
    NODE_ENV: string;
  };
};


const isDevelopment = process.env.NODE_ENV === 'development';

export default function OTPVerificationScreen({
  navigation,
  route,
}: OTPVerificationScreenProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(30);
  const [currentVerificationId, setCurrentVerificationId] = useState(route.params.verificationId);
  const timerRef = useRef<number>();
  const { verifyOTP, sendOTP } = useAuth();
  const { phoneNumber } = route.params;

  useEffect(() => {
    if (isDevelopment) {
      const testUser = FIREBASE_TEST_NUMBERS.find(
        (user) => user.phoneNumber === phoneNumber
      );
      if (testUser) {
        setOtp(testUser.code);
      }
    }
  }, [phoneNumber]);

  useEffect(() => {
    if (timer > 0) {
      timerRef.current = window.setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timer]);

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      await verifyOTP(currentVerificationId, otp);
      // Navigation to main app will be handled by AuthContext
    } catch (error: any) {
      errorHandler.handleError(error, 'OTPVerification');
      Alert.alert(
        'Verification Failed',
        'Invalid OTP code. Please try again or request a new code.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setResending(true);
      const newVerificationId = await sendOTP(phoneNumber);
      setCurrentVerificationId(newVerificationId);
      setTimer(30);
      Alert.alert('Success', 'A new OTP has been sent to your phone number.');
    } catch (error: any) {
      errorHandler.handleError(error, 'OTPVerification');
    } finally {
      setResending(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Verify Your Number
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Enter the 6-digit code sent to {phoneNumber}
        </Text>

        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label="OTP Code"
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
            disabled={loading}
            error={otp.length > 0 && otp.length !== 6}
          />

          {otp.length > 0 && otp.length !== 6 && (
            <Text style={styles.errorText}>
              Please enter a valid 6-digit code
            </Text>
          )}

          <Button
            mode="contained"
            onPress={handleVerifyOTP}
            loading={loading}
            disabled={loading || otp.length !== 6}
            style={styles.button}
          >
            Verify OTP
          </Button>

          <View style={styles.resendContainer}>
            <Text style={styles.timerText}>
              {timer > 0 ? `Resend code in ${formatTime(timer)}` : 'Didn\'t receive the code?'}
            </Text>
            <Button
              mode="text"
              onPress={handleResendOTP}
              loading={resending}
              disabled={resending || timer > 0}
              style={styles.resendButton}
            >
              Resend OTP
            </Button>
          </View>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            disabled={loading || resending}
          >
            Change Phone Number
          </Button>

          {isDevelopment && (
            <Button
              mode="outlined"
              onPress={() => setOtp(TEST_OTP)}
              style={styles.testButton}
              disabled={loading}
            >
              Use Test OTP
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    color: colors.primary,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: colors.text,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.md,
    fontSize: 12,
  },
  button: {
    marginTop: spacing.md,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  timerText: {
    color: colors.disabled,
    marginBottom: spacing.xs,
  },
  resendButton: {
    marginVertical: spacing.xs,
  },
  backButton: {
    marginTop: spacing.md,
  },
  testButton: {
    marginTop: spacing.lg,
  },
}); 