import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high' = 'medium'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export const ErrorCodes = {
  // Auth Errors
  AUTH_INVALID_PHONE: 'auth/invalid-phone',
  AUTH_INVALID_CODE: 'auth/invalid-code',
  AUTH_USER_NOT_FOUND: 'auth/user-not-found',
  
  // Wallet Errors
  WALLET_INSUFFICIENT_BALANCE: 'wallet/insufficient-balance',
  WALLET_INVALID_AMOUNT: 'wallet/invalid-amount',
  WALLET_DAILY_LIMIT: 'wallet/daily-limit-exceeded',
  
  // Order Errors
  ORDER_NOT_FOUND: 'order/not-found',
  ORDER_INVALID_STATUS: 'order/invalid-status',
  ORDER_SPLIT_NOT_APPROVED: 'order/split-not-approved',
  
  // Group Errors
  GROUP_NOT_FOUND: 'group/not-found',
  GROUP_FULL: 'group/full',
  GROUP_INVALID_STATUS: 'group/invalid-status',
  
  // Network Errors
  NETWORK_ERROR: 'network/error',
  SERVER_ERROR: 'server/error',
  
  // Generic Errors
  UNKNOWN_ERROR: 'unknown/error',
  VALIDATION_ERROR: 'validation/error',
} as const;

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCount: { [key: string]: number } = {};
  private lastErrorTime: { [key: string]: number } = {};

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private shouldThrottle(code: string): boolean {
    const now = Date.now();
    const lastTime = this.lastErrorTime[code] || 0;
    const count = this.errorCount[code] || 0;

    // Reset count if last error was more than 1 minute ago
    if (now - lastTime > 60000) {
      this.errorCount[code] = 0;
      return false;
    }

    // Throttle if more than 3 same errors in 1 minute
    return count >= 3;
  }

  private updateErrorStats(code: string) {
    const now = Date.now();
    this.lastErrorTime[code] = now;
    this.errorCount[code] = (this.errorCount[code] || 0) + 1;
  }

  async handleError(error: Error | AppError, context?: string) {
    const code = (error as AppError).code || ErrorCodes.UNKNOWN_ERROR;
    const severity = (error as AppError).severity || 'medium';

    if (this.shouldThrottle(code)) {
      return;
    }

    this.updateErrorStats(code);

    const message = this.getErrorMessage(error, context);

    switch (severity) {
      case 'high':
        this.showAlert(message, code);
        break;
      case 'medium':
        // On web and iOS, show alert. On Android, show notification
        if (Platform.OS === 'android') {
          this.showNotification(message);
        } else {
          this.showAlert(message, code);
        }
        break;
      case 'low':
        this.showNotification(message);
        break;
    }

    // Log error for analytics
    console.error(`[${code}] ${context ? `[${context}] ` : ''}${error.message}`);
  }

  private getErrorMessage(error: Error | AppError, context?: string): string {
    const code = (error as AppError).code;
    
    // Return user-friendly messages based on error code
    switch (code) {
      case ErrorCodes.AUTH_INVALID_PHONE:
        return 'Please enter a valid phone number';
      case ErrorCodes.AUTH_INVALID_CODE:
        return 'Invalid verification code. Please try again';
      case ErrorCodes.WALLET_INSUFFICIENT_BALANCE:
        return 'Insufficient balance in your wallet';
      case ErrorCodes.WALLET_DAILY_LIMIT:
        return 'Daily transaction limit exceeded';
      case ErrorCodes.ORDER_SPLIT_NOT_APPROVED:
        return 'All members must approve their splits first';
      case ErrorCodes.GROUP_FULL:
        return 'This group is already full';
      case ErrorCodes.NETWORK_ERROR:
        return 'Network error. Please check your connection';
      default:
        return error.message || 'An unexpected error occurred';
    }
  }

  private showAlert(message: string, code: string) {
    Alert.alert(
      'Error',
      message,
      [
        { 
          text: 'OK',
          onPress: () => {
            // Handle specific actions based on error code
            switch (code) {
              case ErrorCodes.AUTH_USER_NOT_FOUND:
                // Navigate to login
                break;
              case ErrorCodes.NETWORK_ERROR:
                // Show offline mode options
                break;
            }
          }
        }
      ]
    );
  }

  private async showNotification(message: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'GatherPay',
          body: message,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
      // Fallback to alert if notification fails
      this.showAlert(message, 'notification_failed');
    }
  }
}

export const errorHandler = ErrorHandler.getInstance(); 