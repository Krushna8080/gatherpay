import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, Avatar, Card, Divider, List, Portal, Modal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing } from '../../theme';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainNavigator';

interface ProfileScreenProps {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Profile'>;
}

interface UserProfile {
  name: string;
  email: string;
  phoneNumber: string;
  createdAt: Date;
  updatedAt?: Date;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile({
          name: userData.name || '',
          email: userData.email || '',
          phoneNumber: userData.phoneNumber || user.phoneNumber || '',
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate(),
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowSignOutModal(false);
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      setUpdating(true);
      const userRef = doc(db, 'users', user.uid);
      
      const updateData = {
        name: editName.trim(),
        email: editEmail.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userRef, updateData);
      
      setProfile(prev => prev ? {
        ...prev,
        name: editName.trim(),
        email: editEmail.trim(),
        updatedAt: new Date(),
      } : null);

      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleEditProfile = () => {
    setEditName(profile?.name || '');
    setEditEmail(profile?.email || '');
    setShowEditModal(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerPattern}>
            <View style={[styles.patternCircle, styles.circle1]} />
            <View style={[styles.patternCircle, styles.circle2]} />
            <View style={[styles.patternCircle, styles.circle3]} />
          </View>

          <TouchableOpacity style={styles.avatarContainer} onPress={handleEditProfile}>
            <Avatar.Text
              size={80}
              label={profile?.name?.[0] || user?.phoneNumber?.[0] || '?'}
              style={styles.avatar}
            />
            <View style={styles.editBadge}>
              <MaterialCommunityIcons name="pencil" size={16} color={colors.background} />
            </View>
          </TouchableOpacity>

          <Text style={styles.name}>{profile?.name || 'User'}</Text>
          <Text style={styles.phone}>{profile?.phoneNumber || user?.phoneNumber}</Text>
        </LinearGradient>

        <View style={styles.content}>
          <Card style={styles.infoCard}>
            <Card.Content>
              <List.Section>
                <List.Subheader>Personal Information</List.Subheader>
                <List.Item
                  title="Email"
                  description={profile?.email || 'Not set'}
                  left={props => <List.Icon {...props} icon="email" />}
                />
                <Divider />
                <List.Item
                  title="Phone"
                  description={profile?.phoneNumber || user?.phoneNumber}
                  left={props => <List.Icon {...props} icon="phone" />}
                />
                <Divider />
                <List.Item
                  title="Member Since"
                  description={profile?.createdAt.toLocaleDateString()}
                  left={props => <List.Icon {...props} icon="calendar" />}
                />
              </List.Section>
            </Card.Content>
          </Card>

          <Card style={styles.preferencesCard}>
            <Card.Content>
              <List.Section>
                <List.Subheader>Preferences</List.Subheader>
                <List.Item
                  title="Notifications"
                  left={props => <List.Icon {...props} icon="bell" />}
                  right={props => <List.Icon {...props} icon="chevron-right" />}
                  onPress={() => {}}
                />
                <Divider />
                <List.Item
                  title="Privacy Settings"
                  left={props => <List.Icon {...props} icon="shield-account" />}
                  right={props => <List.Icon {...props} icon="chevron-right" />}
                  onPress={() => navigation.navigate('LocationPrivacy')}
                />
                <Divider />
                <List.Item
                  title="Language"
                  description="English"
                  left={props => <List.Icon {...props} icon="translate" />}
                  right={props => <List.Icon {...props} icon="chevron-right" />}
                  onPress={() => {}}
                />
              </List.Section>
            </Card.Content>
          </Card>

          <Button
            mode="outlined"
            onPress={() => setShowSignOutModal(true)}
            style={styles.signOutButton}
            textColor={colors.error}
          >
            Sign Out
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={showSignOutModal}
          onDismiss={() => setShowSignOutModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>Sign Out</Text>
          <Text variant="bodyMedium" style={styles.modalText}>
            Are you sure you want to sign out?
          </Text>
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setShowSignOutModal(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSignOut}
              style={[styles.modalButton, styles.signOutModalButton]}
              textColor={colors.background}
            >
              Sign Out
            </Button>
          </View>
        </Modal>
        
        <Modal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Edit Profile
          </Text>
          
          <TextInput
            mode="outlined"
            label="Name"
            value={editName}
            onChangeText={setEditName}
            style={styles.modalInput}
            disabled={updating}
          />
          
          <TextInput
            mode="outlined"
            label="Email"
            value={editEmail}
            onChangeText={setEditEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.modalInput}
            disabled={updating}
          />

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setShowEditModal(false)}
              style={styles.modalButton}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleUpdateProfile}
              style={styles.modalButton}
              loading={updating}
              disabled={updating || (!editName.trim() && !editEmail.trim())}
            >
              Save Changes
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 250,
    position: 'relative',
    overflow: 'hidden',
  },
  headerPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  patternCircle: {
    position: 'absolute',
    backgroundColor: colors.background,
    borderRadius: 9999,
  },
  circle1: {
    width: 200,
    height: 200,
    top: -100,
    right: -50,
    opacity: 0.1,
  },
  circle2: {
    width: 150,
    height: 150,
    top: 50,
    right: 50,
    opacity: 0.05,
  },
  circle3: {
    width: 100,
    height: 100,
    top: -20,
    left: 30,
    opacity: 0.08,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    position: 'relative',
  },
  avatar: {
    backgroundColor: colors.primaryDark,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  name: {
    color: colors.background,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  phone: {
    color: colors.background,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    marginTop: -spacing.xl,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  preferencesCard: {
    marginBottom: spacing.lg,
  },
  signOutButton: {
    borderColor: colors.error,
    marginTop: spacing.md,
  },
  modalContainer: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: spacing.lg,
    color: colors.primary,
  },
  modalText: {
    marginBottom: spacing.lg,
    color: colors.textSecondary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalButton: {
    minWidth: 100,
  },
  signOutModalButton: {
    backgroundColor: colors.error,
  },
  modalInput: {
    marginBottom: spacing.md,
  },
});