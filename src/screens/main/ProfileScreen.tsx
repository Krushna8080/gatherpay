import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, Avatar, Card, Divider, List, Portal, Modal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, elevation } from '../../theme';
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

          <View style={styles.topBar}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.background} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>My Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          <TouchableOpacity style={styles.avatarContainer} onPress={handleEditProfile}>
            <View style={styles.avatarWrapper}>
              <Avatar.Text
                size={80}
                label={profile?.name?.[0] || user?.phoneNumber?.[0] || '?'}
                style={styles.avatar}
              />
              <View style={styles.editBadge}>
                <MaterialCommunityIcons name="pencil" size={16} color={colors.background} />
              </View>
            </View>
            <Text style={styles.name}>{profile?.name || 'User'}</Text>
            <Text style={styles.phone}>{profile?.phoneNumber || user?.phoneNumber}</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.content}>
          <Card style={styles.infoCard}>
            <Card.Content>
              <List.Section>
                <List.Subheader style={styles.sectionTitle}>Personal Information</List.Subheader>
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="email" size={24} color={colors.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{profile?.email || 'Not set'}</Text>
                  </View>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="phone" size={24} color={colors.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{profile?.phoneNumber || user?.phoneNumber}</Text>
                  </View>
                </View>
                <Divider style={styles.divider} />
                <View style={styles.infoItem}>
                  <MaterialCommunityIcons name="calendar" size={24} color={colors.primary} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Member Since</Text>
                    <Text style={styles.infoValue}>{profile?.createdAt.toLocaleDateString()}</Text>
                  </View>
                </View>
              </List.Section>
            </Card.Content>
          </Card>

          <Card style={styles.preferencesCard}>
            <Card.Content>
              <List.Section>
                <List.Subheader style={styles.sectionTitle}>Preferences</List.Subheader>
                <TouchableOpacity style={styles.preferenceItem} onPress={() => {}}>
                  <View style={styles.preferenceLeft}>
                    <MaterialCommunityIcons name="bell" size={24} color={colors.primary} />
                    <Text style={styles.preferenceLabel}>Notifications</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
                <Divider style={styles.divider} />
                <TouchableOpacity 
                  style={styles.preferenceItem} 
                  onPress={() => navigation.navigate('LocationPrivacy')}
                >
                  <View style={styles.preferenceLeft}>
                    <MaterialCommunityIcons name="shield-account" size={24} color={colors.primary} />
                    <Text style={styles.preferenceLabel}>Privacy Settings</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
                <Divider style={styles.divider} />
                <TouchableOpacity style={styles.preferenceItem} onPress={() => {}}>
                  <View style={styles.preferenceLeft}>
                    <MaterialCommunityIcons name="translate" size={24} color={colors.primary} />
                    <View style={styles.preferenceContent}>
                      <Text style={styles.preferenceLabel}>Language</Text>
                      <Text style={styles.preferenceValue}>English</Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </List.Section>
            </Card.Content>
          </Card>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={() => setShowSignOutModal(true)}
          >
            <MaterialCommunityIcons name="logout" size={24} color={colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
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
    height: 280,
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.md,
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
    borderRadius: 16,
    ...elevation.small,
  },
  preferencesCard: {
    marginBottom: spacing.lg,
    borderRadius: 16,
    ...elevation.small,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  infoContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  divider: {
    backgroundColor: colors.surfaceVariant,
    height: 1,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceContent: {
    marginLeft: spacing.md,
  },
  preferenceLabel: {
    fontSize: 16,
    color: colors.text,
    marginLeft: spacing.md,
  },
  preferenceValue: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.error}15`,
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  signOutText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.sm,
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