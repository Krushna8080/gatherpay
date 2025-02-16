import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { auth } from '../config/firebase';
import { RecaptchaVerifier as FirebaseRecaptchaVerifier, Auth } from 'firebase/auth';

declare global {
  interface Window {
    recaptchaVerifier: FirebaseRecaptchaVerifier | undefined;
  }
}

export default function RecaptchaVerifier() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new FirebaseRecaptchaVerifier(
          auth as Auth,
          'recaptcha-container',
          {
            size: 'normal',
            callback: () => {
              // reCAPTCHA solved
              console.log('reCAPTCHA solved');
            },
            'expired-callback': () => {
              // Response expired
              console.log('reCAPTCHA expired');
              window.recaptchaVerifier?.render();
            },
          }
        );
      }
    }

    return () => {
      if (Platform.OS === 'web' && window.recaptchaVerifier) {
        window.recaptchaVerifier = undefined;
      }
    };
  }, []);

  // Only render the container on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  return <View id="recaptcha-container" style={{ display: 'none' }} />;
} 