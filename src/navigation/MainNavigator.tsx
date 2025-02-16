import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/main/HomeScreen';
import CreateGroupScreen from '../screens/main/CreateGroupScreen';
import GroupDetailsScreen from '../screens/main/GroupDetailsScreen';
import WalletScreen from '../screens/main/WalletScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import LocationPrivacyScreen from '../screens/main/LocationPrivacyScreen';

export type MainStackParamList = {
  Home: undefined;
  CreateGroup: undefined;
  GroupDetails: { groupId: string };
  Wallet: undefined;
  Profile: undefined;
  LocationPrivacy: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export default function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'GatherPay' }}
      />
      <Stack.Screen 
        name="CreateGroup" 
        component={CreateGroupScreen}
        options={{ title: 'Create Group' }}
      />
      <Stack.Screen 
        name="GroupDetails" 
        component={GroupDetailsScreen}
        options={{ title: 'Group Details' }}
      />
      <Stack.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{ title: 'My Wallet' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen 
        name="LocationPrivacy" 
        component={LocationPrivacyScreen}
        options={{ title: 'Location Privacy' }}
      />
    </Stack.Navigator>
  );
} 