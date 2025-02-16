export const TEST_USERS = [
  {
    phoneNumber: '+911234567890',
    name: 'Test User 1',
    email: 'test1@gatherpay.com',
    location: {
      latitude: 12.9716,
      longitude: 77.5946, // Bangalore
    },
    wallet: {
      balance: 1000,
      rewardCoins: 500,
    },
  },
  {
    phoneNumber: '+911234567891',
    name: 'Test User 2',
    email: 'test2@gatherpay.com',
    location: {
      latitude: 12.9719,
      longitude: 77.5937, // ~100m from User 1
    },
    wallet: {
      balance: 750,
      rewardCoins: 200,
    },
  },
  {
    phoneNumber: '+911234567892',
    name: 'Test User 3',
    email: 'test3@gatherpay.com',
    location: {
      latitude: 12.9722,
      longitude: 77.5928, // ~200m from User 1
    },
    wallet: {
      balance: 1500,
      rewardCoins: 1000,
    },
  },
  {
    phoneNumber: '+911234567893',
    name: 'Test User 4',
    email: 'test4@gatherpay.com',
    location: {
      latitude: 12.9725,
      longitude: 77.5919, // ~300m from User 1
    },
    wallet: {
      balance: 2000,
      rewardCoins: 1500,
    },
  },
] as const;

// Sample transactions for testing
export const TEST_TRANSACTIONS = [
  {
    type: 'credit',
    amount: 500,
    description: 'Added money to wallet',
    timestamp: new Date(Date.now() - 86400000), // 1 day ago
  },
  {
    type: 'debit',
    amount: 200,
    description: 'Group order payment',
    timestamp: new Date(Date.now() - 43200000), // 12 hours ago
  },
  {
    type: 'credit',
    amount: 100,
    description: 'Reward for leading group order',
    timestamp: new Date(Date.now() - 21600000), // 6 hours ago
  },
] as const;

// Test OTP for development
export const TEST_OTP = '123456';

export interface TestUser {
  phoneNumber: string;
  code: string;
  name: string;
  email: string;
  balance: number;
  rewardCoins: number;
}

export const FIREBASE_TEST_NUMBERS: TestUser[] = [
  {
    phoneNumber: '+919876543210',
    code: TEST_OTP,
    name: 'Test User 1',
    email: 'test1@gatherpay.com',
    balance: 1000,
    rewardCoins: 100
  },
  {
    phoneNumber: '+919876543211',
    code: TEST_OTP,
    name: 'Test User 2', 
    email: 'test2@gatherpay.com',
    balance: 2000,
    rewardCoins: 200
  },
  {
    phoneNumber: '+919876543212',
    code: TEST_OTP,
    name: 'Test User 3',
    email: 'test3@gatherpay.com',
    balance: 3000,
    rewardCoins: 300
  },
  {
    phoneNumber: '+919876543213',
    code: TEST_OTP,
    name: 'Test User 4',
    email: 'test4@gatherpay.com',
    balance: 4000,
    rewardCoins: 400
  }
]; 