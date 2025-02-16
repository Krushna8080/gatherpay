import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Switch, Button, List, Divider, RadioButton } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing } from '../../theme';
import { locationPrivacyManager, LocationPrivacySettings } from '../../utils/LocationPrivacyManager';
import { errorHandler } from '../../utils/ErrorHandler';
import { useAuth } from '../../contexts/AuthContext';

type LocationPrivacyScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'LocationPrivacy'>;
};

const DEFAULT_SETTINGS: LocationPrivacySettings = {
  shareLocation: true,
  shareWithGroups: true,
  shareWithDelivery: true,
  precisionLevel: 'exact',
  visibleToNearbyGroups: true,
  maxVisibilityRadius: 5000,
  retentionPeriod: 24,
};

export default function LocationPrivacyScreen({ navigation }: LocationPrivacyScreenProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<LocationPrivacySettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (user && !initialized) {
      initializeSettings();
    }
  }, [user, initialized]);

  const initializeSettings = async () => {
    try {
      await locationPrivacyManager.init(user!.uid);
      const currentSettings = locationPrivacyManager.getSettings();
      setSettings(currentSettings);
      setInitialized(true);
    } catch (error: any) {
      errorHandler.handleError(error, 'LocationPrivacyScreen');
      // Use default settings if there's an error
      setSettings(DEFAULT_SETTINGS);
      setInitialized(true);
    }
  };

  const handleToggleSetting = (key: keyof LocationPrivacySettings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    }
  };

  const handlePrecisionChange = (value: 'exact' | 'approximate' | 'area') => {
    setSettings(prev => ({
      ...prev,
      precisionLevel: value
    }));
  };

  const handleRadiusChange = (value: number) => {
    setSettings(prev => ({
      ...prev,
      maxVisibilityRadius: value
    }));
  };

  const handleSaveSettings = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save settings');
      return;
    }

    try {
      setSaving(true);
      await locationPrivacyManager.updateSettings(settings);
      navigation.goBack();
    } catch (error: any) {
      errorHandler.handleError(error, 'LocationPrivacyScreen');
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!initialized) {
    return (
      <View style={styles.centered}>
        <Text>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="titleLarge" style={styles.title}>
          Location Privacy Settings
        </Text>

        <List.Section>
          <List.Subheader>General Settings</List.Subheader>
          
          <List.Item
            title="Share Location"
            description="Allow app to access and share your location"
            right={() => (
              <Switch
                value={settings.shareLocation}
                onValueChange={() => handleToggleSetting('shareLocation')}
              />
            )}
          />

          <Divider />

          <List.Item
            title="Share with Groups"
            description="Share location with group members during delivery"
            right={() => (
              <Switch
                value={settings.shareWithGroups}
                onValueChange={() => handleToggleSetting('shareWithGroups')}
                disabled={!settings.shareLocation}
              />
            )}
          />

          <Divider />

          <List.Item
            title="Share with Delivery"
            description="Share location for delivery coordination"
            right={() => (
              <Switch
                value={settings.shareWithDelivery}
                onValueChange={() => handleToggleSetting('shareWithDelivery')}
                disabled={!settings.shareLocation}
              />
            )}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Location Precision</List.Subheader>
          
          <RadioButton.Group
            value={settings.precisionLevel}
            onValueChange={(value) => {
              if (value === 'exact' || value === 'approximate' || value === 'area') {
                handlePrecisionChange(value);
              }
            }}
          >
            <RadioButton.Item
              label="Exact Location"
              value="exact"
              disabled={!settings.shareLocation}
            />
            <RadioButton.Item
              label="Approximate (100m radius)"
              value="approximate"
              disabled={!settings.shareLocation}
            />
            <RadioButton.Item
              label="Area Only (1km radius)"
              value="area"
              disabled={!settings.shareLocation}
            />
          </RadioButton.Group>
        </List.Section>

        <List.Section>
          <List.Subheader>Visibility Range</List.Subheader>
          
          <List.Item
            title="Visible to Nearby Groups"
            description="Show your groups to nearby users"
            right={() => (
              <Switch
                value={settings.visibleToNearbyGroups}
                onValueChange={() => handleToggleSetting('visibleToNearbyGroups')}
                disabled={!settings.shareLocation}
              />
            )}
          />

          <View style={styles.radiusContainer}>
            <Text>Maximum Visibility Radius</Text>
            <View style={styles.radiusOptions}>
              {[1000, 2000, 5000, 10000].map((radius) => (
                <Button
                  key={radius}
                  mode={settings.maxVisibilityRadius === radius ? 'contained' : 'outlined'}
                  onPress={() => handleRadiusChange(radius)}
                  disabled={!settings.shareLocation || !settings.visibleToNearbyGroups}
                  style={styles.radiusButton}
                >
                  {radius / 1000}km
                </Button>
              ))}
            </View>
          </View>
        </List.Section>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleSaveSettings}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
          >
            Save Settings
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            disabled={saving}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
        </View>

        <Text style={styles.disclaimer}>
          Your privacy is important to us. These settings help you control how your
          location information is shared within the app.
        </Text>
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
    marginBottom: spacing.lg,
    color: colors.primary,
  },
  radiusContainer: {
    padding: spacing.md,
  },
  radiusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  radiusButton: {
    minWidth: 80,
  },
  footer: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  saveButton: {
    marginBottom: spacing.sm,
  },
  cancelButton: {
    borderColor: colors.error,
  },
  disclaimer: {
    marginTop: spacing.xl,
    textAlign: 'center',
    color: colors.disabled,
    fontSize: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 