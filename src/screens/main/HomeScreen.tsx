import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, FAB, IconButton, Divider, ActivityIndicator, Button } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, elevation } from '../../theme';
import * as Location from 'expo-location';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useWallet } from '../../contexts/WalletContext';
import { BalanceCard } from '../../components/ui/BalanceCard';
import { Card } from '../../components/ui/Card';
import { Group } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CategoryButton } from '../../components/ui/CategoryButton';
import { LinearGradient } from 'expo-linear-gradient';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Home'>;
};

const MAX_DISTANCE = 5000; // 5km radius

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [nearbyGroups, setNearbyGroups] = useState<Group[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { user } = useAuth();
  const { balance, rewardCoins, refreshWallet } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSection, setSelectedSection] = useState<'nearby' | 'active'>('nearby');

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (!user || !userLocation) return;

    const groupsRef = collection(db, 'groups');
    const q = query(
      groupsRef,
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nearby: Group[] = [];
      const owned: Group[] = [];
      
      snapshot.forEach((doc) => {
        const groupData = { id: doc.id, ...doc.data() } as Group;
        
        // Calculate distance from user
        const distance = calculateDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          groupData.location.latitude,
          groupData.location.longitude
        );

        groupData.distance = distance;

        // Check if user is creator or member
        if (groupData.createdBy === user.uid || groupData.members[user.uid]) {
          owned.push(groupData);
        } 
        // Only include nearby groups that user is not part of
        else if (distance <= MAX_DISTANCE) {
          nearby.push(groupData);
        }
      });

      // Sort groups by distance
      nearby.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      owned.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      
      setNearbyGroups(nearby);
      setUserGroups(owned);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userLocation]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission is required to find nearby groups');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation(location);
      setLocationError(null);
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Failed to get your location');
    }
  };

  const formatDistance = (meters: number | undefined): string => {
    if (!meters) return 'Unknown distance';
    if (meters < 1000) {
      return `${Math.round(meters)}m away`;
    }
    return `${(meters / 1000).toFixed(1)}km away`;
  };

  const renderGroupCard = ({ item }: { item: Group }) => (
    <TouchableOpacity 
      onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })}
      style={styles.groupCard}
    >
      <Card variant="secondary" style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.memberCount}>{item.memberCount} members</Text>
          </View>
          
          <View style={styles.cardDetails}>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Target Amount:</Text>
              <Text style={styles.amount}>₹{item.targetAmount}</Text>
            </View>
            {item.distance && (
              <Text style={styles.distance}>{formatDistance(item.distance)} away</Text>
            )}
          </View>

          <View style={styles.cardFooter}>
            <StatusBadge status={item.status} />
            <IconButton 
              icon="chevron-right" 
              size={24} 
              iconColor={colors.primary}
            />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text variant="titleLarge" style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const renderContent = () => {
    if (locationError) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{locationError}</Text>
          <Text onPress={getUserLocation} style={styles.retryButton}>
            Grant Location Permission
          </Text>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Finding groups...</Text>
        </View>
      );
    }

    const groupsToShow = selectedSection === 'nearby' ? nearbyGroups : userGroups;

    return (
      <View style={styles.groupsContainer}>
        {groupsToShow.length > 0 ? (
          <FlatList
            data={groupsToShow}
            renderItem={renderGroupCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.groupsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={getUserLocation} />
            }
          />
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name={selectedSection === 'nearby' ? 'map-search' : 'account-group'} 
              size={64} 
              color={colors.disabled} 
            />
            <Text style={styles.emptyTitle}>
              {selectedSection === 'nearby' ? 'No nearby groups' : 'No active groups'}
            </Text>
            <Text style={styles.subText}>
              {selectedSection === 'nearby' 
                ? 'Create a new group to get started!' 
                : 'Join or create a group to see it here'}
            </Text>
            <Button 
              mode="contained"
              onPress={() => navigation.navigate('CreateGroup')}
              style={styles.emptyButton}
            >
              Create Group
            </Button>
          </View>
        )}
      </View>
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refreshWallet(),
      // Add other refresh logic
    ]);
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerPattern}>
              {/* Add decorative circles */}
              <View style={[styles.patternCircle, styles.circle1]} />
              <View style={[styles.patternCircle, styles.circle2]} />
              <View style={[styles.patternCircle, styles.circle3]} />
            </View>
            <View style={styles.headerContent}>
              <Text variant="titleMedium" style={styles.greeting}>
                Welcome back,
              </Text>
              <Text variant="headlineSmall" style={styles.name}>
                {user?.displayName || user?.phoneNumber}
              </Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.balanceSection}>
            <BalanceCard
              title="Wallet Balance"
              balance={balance}
              subtitle="Available for group orders"
              onPress={() => navigation.navigate('Wallet')}
            />

            <BalanceCard
              title="Reward Coins"
              balance={rewardCoins}
              variant="secondary"
              subtitle="Earn more by leading groups"
              onPress={() => navigation.navigate('Wallet')}
            />
          </View>

          <View style={styles.actionsSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Quick Actions</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.actionsContainer}
            >
              <CategoryButton
                icon="plus-circle"
                label="Create Group"
                onPress={() => navigation.navigate('CreateGroup')}
                variant="primary"
              />
              <CategoryButton
                icon="wallet"
                label="My Wallet"
                onPress={() => navigation.navigate('Wallet')}
                variant="secondary"
              />
              <CategoryButton
                icon="account"
                label="Profile"
                onPress={() => navigation.navigate('Profile')}
                variant="accent"
              />
              <CategoryButton
                icon="map-marker"
                label="Location"
                onPress={() => navigation.navigate('LocationPrivacy')}
                variant="secondary"
              />
            </ScrollView>
          </View>

          <View style={styles.groupsSection}>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>Groups</Text>
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  onPress={() => setSelectedSection('nearby')}
                  style={[
                    styles.tab,
                    selectedSection === 'nearby' && styles.activeTab
                  ]}
                >
                  <Text style={[
                    styles.tabText,
                    selectedSection === 'nearby' && styles.activeTabText
                  ]}>
                    Nearby
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedSection('active')}
                  style={[
                    styles.tab,
                    selectedSection === 'active' && styles.activeTab
                  ]}
                >
                  <Text style={[
                    styles.tabText,
                    selectedSection === 'active' && styles.activeTabText
                  ]}>
                    Active
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {renderContent()}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 180,
    overflow: 'hidden',
  },
  headerGradient: {
    flex: 1,
    position: 'relative',
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
  headerContent: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  mainContent: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: spacing.lg,
  },
  greeting: {
    color: colors.background,
    opacity: 0.9,
  },
  name: {
    color: colors.background,
    fontWeight: 'bold',
  },
  balanceSection: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionsSection: {
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    color: colors.text,
    fontWeight: 'bold',
  },
  actionsContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    flexDirection: 'row',
  },
  card: {
    marginBottom: spacing.md,
  },
  groupCard: {
    marginBottom: spacing.md,
  },
  cardContent: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  memberCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardDetails: {
    gap: spacing.sm,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  amountLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  amount: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  distance: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
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
  subText: {
    marginTop: spacing.sm,
    color: colors.disabled,
  },
  retryButton: {
    marginTop: spacing.md,
  },
  fab: {
    position: 'absolute',
    margin: spacing.md,
    right: 0,
    bottom: 0,
  },
  section: {
    marginBottom: spacing.lg,
  },
  groupsContainer: {
    flex: 1,
    minHeight: 400,
  },
  groupsList: {
    padding: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyButton: {
    marginTop: spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 9999,
    padding: 4,
    ...elevation.small,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.textSecondary,
  },
  activeTab: {
    backgroundColor: colors.primary,
    color: colors.background,
    borderRadius: 9999,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.background,
  },
  groupsSection: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    ...elevation.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
}); 