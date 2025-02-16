import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, elevation } from '../../theme';
import * as Location from 'expo-location';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type CreateGroupScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'CreateGroup'>;
};

type Step = 'name' | 'details' | 'amount' | 'location';

export default function CreateGroupScreen({ navigation }: CreateGroupScreenProps) {
  const [currentStep, setCurrentStep] = useState<Step>('name');
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

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a group');
      return;
    }

    const amount = parseFloat(targetAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid target amount');
      return;
    }

    try {
      setLoading(true);

      const membersMap = {
        [user.uid]: true
      };

      const groupRef = await addDoc(collection(db, 'groups'), {
        name,
        description,
        targetAmount: amount,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        status: 'open',
        memberCount: 1,
        members: membersMap,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        lastUpdated: serverTimestamp(),
      });

      navigation.replace('GroupDetails', { groupId: groupRef.id });
    } catch (error: any) {
      console.error('Error creating group:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create group. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getStepProgress = () => {
    const steps: Step[] = ['name', 'details', 'amount', 'location'];
    return (steps.indexOf(currentStep) + 1) / steps.length * 100;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'name':
        return name.length >= 3;
      case 'details':
        return description.length >= 10;
      case 'amount':
        const amount = parseFloat(targetAmount);
        return !isNaN(amount) && amount > 0;
      case 'location':
        return !!location;
      default:
        return false;
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'name':
        setCurrentStep('details');
        break;
      case 'details':
        setCurrentStep('amount');
        break;
      case 'amount':
        setCurrentStep('location');
        break;
      case 'location':
        handleCreateGroup();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'details':
        setCurrentStep('name');
        break;
      case 'amount':
        setCurrentStep('details');
        break;
      case 'location':
        setCurrentStep('amount');
        break;
      default:
        navigation.goBack();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'name':
        return (
          <View style={styles.stepContainer}>
            <MaterialCommunityIcons name="account-group" size={48} color={colors.primary} style={styles.stepIcon} />
            <Text variant="headlineMedium" style={styles.stepTitle}>Name Your Group</Text>
            <Text variant="bodyMedium" style={styles.stepDescription}>
              Choose a memorable name for your group order
            </Text>
            <TextInput
              mode="outlined"
              label="Group Name"
              value={name}
              onChangeText={setName}
              style={styles.input}
              maxLength={50}
            />
          </View>
        );

      case 'details':
        return (
          <View style={styles.stepContainer}>
            <MaterialCommunityIcons name="text-box" size={48} color={colors.primary} style={styles.stepIcon} />
            <Text variant="headlineMedium" style={styles.stepTitle}>Add Description</Text>
            <Text variant="bodyMedium" style={styles.stepDescription}>
              Describe what you're ordering and any special instructions
            </Text>
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
          </View>
        );

      case 'amount':
        return (
          <View style={styles.stepContainer}>
            <MaterialCommunityIcons name="currency-inr" size={48} color={colors.primary} style={styles.stepIcon} />
            <Text variant="headlineMedium" style={styles.stepTitle}>Set Target Amount</Text>
            <Text variant="bodyMedium" style={styles.stepDescription}>
              Set the expected total amount for this group order
            </Text>
            <TextInput
              mode="outlined"
              label="Target Amount (₹)"
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="number-pad"
              style={styles.input}
              left={<TextInput.Affix text="₹" />}
            />
          </View>
        );

      case 'location':
        return (
          <View style={styles.stepContainer}>
            <MaterialCommunityIcons name="map-marker" size={48} color={colors.primary} style={styles.stepIcon} />
            <Text variant="headlineMedium" style={styles.stepTitle}>Confirm Location</Text>
            <Text variant="bodyMedium" style={styles.stepDescription}>
              Your group will be visible to users within 5km of your current location
            </Text>
            {locationError ? (
              <>
                <Text style={styles.errorText}>{locationError}</Text>
                <Button 
                  mode="contained" 
                  onPress={checkLocationPermission}
                  style={styles.retryButton}
                >
                  Grant Location Permission
                </Button>
              </>
            ) : !location ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <View style={styles.locationConfirmed}>
                <MaterialCommunityIcons name="check-circle" size={64} color={colors.success} />
                <Text style={styles.locationText}>Location Confirmed</Text>
              </View>
            )}
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary + '20', colors.background]}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={handleBack}
          />
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${getStepProgress()}%` }]} />
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {renderStep()}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleNext}
            loading={loading}
            disabled={loading || !canProceed()}
            style={styles.button}
          >
            {currentStep === 'location' ? 'Create Group' : 'Next'}
          </Button>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  header: {
    padding: spacing.md,
  },
  progressContainer: {
    height: 4,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  stepContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  stepIcon: {
    marginBottom: spacing.md,
  },
  stepTitle: {
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  stepDescription: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    width: '100%',
    marginBottom: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    ...elevation.small,
  },
  button: {
    width: '100%',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    marginTop: spacing.md,
  },
  locationConfirmed: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  locationText: {
    color: colors.success,
    marginTop: spacing.sm,
    fontSize: 16,
    fontWeight: '600',
  },
}); 