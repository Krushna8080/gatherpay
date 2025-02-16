import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import {
  PhoneAuthProvider,
  signInWithCredential,
  User,
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import Constants from 'expo-constants';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sendOTP: (phoneNumber: string) => Promise<string>;
  verifyOTP: (verificationId: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

export interface UserProfile {
  phoneNumber: string;
  name?: string;
  email?: string;
  createdAt: Date;
  wallet: {
    balance: number;
    rewardCoins: number;
  };
  groups: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Test verification ID for development
const TEST_VERIFICATION_ID = 'test-verification-id';
const TEST_PHONE_NUMBER = '+918080166050';
const TEST_OTP = '123456';
const TEST_EMAIL = 'test@gatherpay.com';
const TEST_PASSWORD = 'Test@123456';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
              phoneNumber: user.phoneNumber || TEST_PHONE_NUMBER,
              createdAt: serverTimestamp(),
              wallet: {
                balance: 0,
                rewardCoins: 0,
              },
              groups: [],
            });
          }
        } catch (error) {
          console.error('Error checking/creating user profile:', error);
        }
      }
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const sendOTP = async (phoneNumber: string) => {
    try {
      // For test phone number, return test verification ID
      if (phoneNumber === TEST_PHONE_NUMBER) {
        return TEST_VERIFICATION_ID;
      }
      throw new Error('Only test phone number (+918080166050) is allowed in development mode');
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  };

  const verifyOTP = async (verificationId: string, code: string) => {
    try {
      // For test credentials
      if (verificationId === TEST_VERIFICATION_ID && code === TEST_OTP) {
        try {
          // Try to sign in with test credentials
          await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
            .catch(async () => {
              // If test user doesn't exist, create it
              await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
            });
          return;
        } catch (error) {
          console.error('Error with test authentication:', error);
          throw error;
        }
      }
      throw new Error('Invalid OTP. For testing, use code: 123456');
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const signOut = () => auth.signOut();

  const value = {
    user,
    loading,
    sendOTP,
    verifyOTP,
    signOut,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 