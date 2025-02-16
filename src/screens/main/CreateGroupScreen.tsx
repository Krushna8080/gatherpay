import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing } from '../../theme';
import * as Location from 'expo-location';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

type CreateGroupScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'CreateGroup'>;
};

export default function CreateGroupScreen({ navigation }: CreateGroupScreenProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      setLocationError(null);
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationError('Location permission is required to create a group');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Unable to get your location. Please check your GPS settings.');
    }
  };

  const handleCreateGroup = async () => {
    if (!name || !description || !targetAmount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Location is required to create a group');
      return;
    }

    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }

    try {
      setLoading(true);

      // Create group in Firestore
      const groupRef = await addDoc(collection(db, 'groups'), {
        name,
        description,
        targetAmount: amount,
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
        status: 'open',
        memberCount: 1,
        members: [user?.uid],
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        lastUpdated: serverTimestamp(),
      });

      // Navigate to group details
      navigation.replace('GroupDetails', { groupId: groupRef.id });
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (locationError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{locationError}</Text>
        <Button 
          mode="contained" 
          onPress={checkLocationPermission}
          style={styles.retryButton}
        >
          Grant Location Permission
        </Button>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Create New Group
        </Text>

        <View style={styles.form}>
          <TextInput
            mode="outlined"
            label="Group Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            maxLength={50}
          />

          <TextInput
            mode="outlined"
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={styles.input}
            maxLength={200}
          />

          <TextInput
            mode="outlined"
            label="Target Amount (₹)"
            value={targetAmount}
            onChangeText={setTargetAmount}
            keyboardType="number-pad"
            style={styles.input}
            left={<TextInput.Affix text="₹" />}
          />

          <Text variant="bodySmall" style={styles.locationText}>
            Your group will be visible to users within 5km of your current location
          </Text>

          <Button
            mode="contained"
            onPress={handleCreateGroup}
            loading={loading}
            disabled={loading || !name || !description || !targetAmount}
            style={styles.button}
          >
            Create Group
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </Button>
        </View>
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
    marginBottom: spacing.xl,
    color: colors.primary,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: spacing.md,
  },
  button: {
    marginTop: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.error,
  },
  loadingText: {
    marginTop: spacing.md,
  },
  retryButton: {
    marginTop: spacing.md,
  },
  locationText: {
    textAlign: 'center',
    color: colors.disabled,
    marginBottom: spacing.md,
  },
}); 