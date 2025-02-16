import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, TextInput, Avatar, Divider } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing } from '../../theme';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Profile'>;
};

interface UserProfile {
  phoneNumber: string;
  name?: string;
  email?: string;
  createdAt: any; // Firestore Timestamp
  wallet: {
    balance: number;
    rewardCoins: number;
  };
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      if (!user) return;
      
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      if (profileDoc.exists()) {
        const profileData = profileDoc.data() as UserProfile;
        setProfile(profileData);
        setName(profileData.name || '');
        setEmail(profileData.email || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const profileRef = doc(db, 'users', user.uid);
      await updateDoc(profileRef, {
        name,
        email,
      });
      await fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      // Handle both Firestore Timestamp and regular Date objects
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={name ? name.substring(0, 2).toUpperCase() : '??'}
        />
        <Text variant="headlineSmall" style={styles.phoneNumber}>
          {profile?.phoneNumber}
        </Text>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.form}>
        <TextInput
          mode="outlined"
          label="Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleUpdateProfile}
          loading={saving}
          disabled={saving}
          style={styles.updateButton}
        >
          Update Profile
        </Button>
      </View>

      <View style={styles.statsContainer}>
        <Text variant="titleMedium" style={styles.statsTitle}>
          Account Statistics
        </Text>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text variant="headlineSmall">₹{profile?.wallet.balance || 0}</Text>
            <Text variant="bodyMedium">Wallet Balance</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="headlineSmall">
              {profile?.wallet.rewardCoins || 0}
            </Text>
            <Text variant="bodyMedium">Reward Coins</Text>
          </View>
        </View>
      </View>

      <Button
        mode="outlined"
        onPress={handleSignOut}
        style={styles.signOutButton}
        textColor={colors.error}
      >
        Sign Out
      </Button>

      <Text variant="bodySmall" style={styles.joinedDate}>
        Joined on {profile?.createdAt ? formatDate(profile.createdAt) : 'N/A'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  phoneNumber: {
    marginTop: spacing.md,
    color: colors.primary,
  },
  divider: {
    marginVertical: spacing.md,
  },
  form: {
    padding: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  updateButton: {
    marginTop: spacing.sm,
  },
  statsContainer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  statsTitle: {
    marginBottom: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  signOutButton: {
    margin: spacing.lg,
    borderColor: colors.error,
  },
  joinedDate: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.disabled,
  },
});