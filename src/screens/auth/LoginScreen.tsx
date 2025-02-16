import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Text, List } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { colors, spacing } from '../../theme';
import { FIREBASE_TEST_NUMBERS } from '../../utils/testData';

declare const process: {
  env: {
    NODE_ENV: string;
  };
};

const isDevelopment = process.env.NODE_ENV === 'development';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [phoneNumber, setPhoneNumber] = useState('8080166050');
  const [loading, setLoading] = useState(false);
  const [showTestUsers, setShowTestUsers] = useState(false);
  const { sendOTP } = useAuth();

  const handleSendOTP = async (testPhoneNumber?: string) => {
    try {
      setLoading(true);
      
      // Format the phone number with country code
      const formattedNumber = testPhoneNumber || (phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`);
      
      // Validate phone number format
      if (!formattedNumber.match(/^\+[1-9]\d{10,14}$/)) {
        throw new Error('Please enter a valid phone number with country code (e.g., +91XXXXXXXXXX)');
      }

      const verificationId = await sendOTP(formattedNumber);

      navigation.navigate('OTPVerification', {
        phoneNumber: formattedNumber,
        verificationId,
      });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to send OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTestUserSelect = (testPhoneNumber: string) => {
    setPhoneNumber(testPhoneNumber.replace('+91', ''));
    handleSendOTP(testPhoneNumber);
  };

  const formatPhoneNumber = (text: string) => {
    return text.replace(/\D/g, '');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Welcome to GatherPay
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Enter your phone number to continue
        </Text>

        <TextInput
          mode="outlined"
          label="Phone Number"
          value={phoneNumber}
          onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
          keyboardType="phone-pad"
          style={styles.input}
          disabled={loading}
          placeholder="XXXXXXXXXX"
          left={<TextInput.Affix text="+91" />}
          maxLength={10}
        />

        <Button
          mode="contained"
          onPress={() => handleSendOTP()}
          loading={loading}
          disabled={!phoneNumber || loading || phoneNumber.length < 10}
          style={styles.button}
        >
          Send OTP
        </Button>

        <Text variant="bodySmall" style={styles.testNote}>
          For testing, use phone: 8080166050 and OTP: 123456
        </Text>

        {showTestUsers && (
          <View style={styles.testUsersContainer}>
            <Text variant="titleMedium" style={styles.testUsersTitle}>
              Test Users
            </Text>
            {FIREBASE_TEST_NUMBERS.map((user) => (
              <List.Item
                key={user.phoneNumber}
                title={user.name}
                description={user.phoneNumber}
                onPress={() => handleTestUserSelect(user.phoneNumber)}
                left={(props) => <List.Icon {...props} icon="account" />}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
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
  input: {
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.md,
  },
  testNote: {
    textAlign: 'center',
    marginTop: spacing.md,
    color: colors.disabled,
  },
  testUsersContainer: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
  },
  testUsersTitle: {
    marginBottom: spacing.md,
    color: colors.primary,
  },
}); 