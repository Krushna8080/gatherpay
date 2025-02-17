import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, RefreshControl, TouchableOpacity, ImageBackground } from 'react-native';
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
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';

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
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <Text style={styles.groupName}>{item.name}</Text>
            <View style={styles.memberInfo}>
              <MaterialCommunityIcons name="account-group" size={16} color={colors.textSecondary} />
              <Text style={styles.memberCount}>{item.memberCount} members</Text>
            </View>
          </View>
          <StatusBadge status={item.status} />
        </View>
        
        <View style={styles.cardDetails}>
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          <View style={styles.cardFooter}>
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Target:</Text>
              <Text style={styles.amount}>₹{item.targetAmount}</Text>
            </View>
            {item.distance && (
              <View style={styles.distanceContainer}>
                <MaterialCommunityIcons name="map-marker" size={16} color={colors.textSecondary} />
                <Text style={styles.distance}>{formatDistance(item.distance)}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
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
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons 
              name="wallet-giftcard" 
              size={24} 
              color={colors.primary} 
            />
            <Text style={styles.appTitle}>GatherPay</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => navigation.navigate('Profile')}
          >
            <MaterialCommunityIcons 
              name="account-circle" 
              size={28} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </View>

        {/* Main Header Section */}
        <View style={styles.headerSection}>
          <LinearGradient
            colors={colors.gradient.purple}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userName}>
                  {user?.displayName || user?.phoneNumber}
                </Text>
              </View>

              {/* Balance Summary Cards */}
              <View style={styles.balanceCardsRow}>
                <View style={styles.balanceCard}>
                  <View style={styles.balanceHeader}>
                    <MaterialCommunityIcons name="wallet" size={20} color={colors.background} style={styles.balanceIcon} />
                    <Text style={styles.balanceTitle}>Wallet Balance</Text>
                  </View>
                  <View style={styles.balanceAmount}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <Text style={styles.balanceValue}>{balance}</Text>
                  </View>
                  <Text style={styles.balanceSubtext}>Available for group orders</Text>
                </View>

                <View style={[styles.balanceCard, styles.rewardCard]}>
                  <View style={styles.balanceHeader}>
                    <MaterialCommunityIcons name="gift" size={20} color={colors.background} style={styles.balanceIcon} />
                    <Text style={styles.balanceTitle}>Reward Coins</Text>
                  </View>
                  <View style={styles.balanceAmount}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <Text style={styles.balanceValue}>{rewardCoins}</Text>
                  </View>
                  <Text style={styles.balanceSubtext}>Earn more by leading groups</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.mainContent}>
          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('CreateGroup')}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
                  <MaterialCommunityIcons name="plus-circle" size={24} color={colors.background} />
                </View>
                <Text style={styles.actionLabel}>Create Group</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Wallet')}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.secondary }]}>
                  <MaterialCommunityIcons name="wallet" size={24} color={colors.background} />
                </View>
                <Text style={styles.actionLabel}>My Wallet</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('LocationPrivacy')}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.warning }]}>
                  <MaterialCommunityIcons name="map-marker" size={24} color={colors.background} />
                </View>
                <Text style={styles.actionLabel}>Location</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Groups Section */}
          <View style={styles.groupsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Groups</Text>
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  onPress={() => setSelectedSection('nearby')}
                  style={[styles.tab, selectedSection === 'nearby' && styles.activeTab]}
                >
                  <MaterialCommunityIcons 
                    name="map-marker-radius" 
                    size={20} 
                    color={selectedSection === 'nearby' ? colors.background : colors.textSecondary} 
                  />
                  <Text style={[styles.tabText, selectedSection === 'nearby' && styles.activeTabText]}>
                    Nearby
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedSection('active')}
                  style={[styles.tab, selectedSection === 'active' && styles.activeTab]}
                >
                  <MaterialCommunityIcons 
                    name="account-group" 
                    size={20} 
                    color={selectedSection === 'active' ? colors.background : colors.textSecondary} 
                  />
                  <Text style={[styles.tabText, selectedSection === 'active' && styles.activeTabText]}>
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceVariant,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.primary}10`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
  },
  headerSection: {
    marginBottom: spacing.lg,
  },
  headerGradient: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
  },
  welcomeContainer: {
    marginBottom: spacing.lg,
  },
  welcomeText: {
    color: colors.background,
    fontSize: 14,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  userName: {
    color: colors.background,
    fontSize: 24,
    fontWeight: 'bold',
  },
  balanceCardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: spacing.md,
  },
  rewardCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  balanceIcon: {
    marginRight: spacing.xs,
    opacity: 0.9,
  },
  balanceTitle: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },
  balanceAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  currencySymbol: {
    color: colors.background,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: spacing.xs,
  },
  balanceValue: {
    color: colors.background,
    fontSize: 24,
    fontWeight: 'bold',
  },
  balanceSubtext: {
    color: colors.background,
    fontSize: 12,
    opacity: 0.8,
  },
  mainContent: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: spacing.xl,
  },
  actionsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    ...elevation.small,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  groupsSection: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 9999,
    padding: 4,
    ...elevation.small,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  activeTab: {
    backgroundColor: colors.primary,
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
  groupCard: {
    marginBottom: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surface,
    ...elevation.small,
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardTitleSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardDetails: {
    gap: spacing.md,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
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
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  distance: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.error,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  subText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    borderRadius: 12,
    paddingHorizontal: spacing.xl,
  },
  retryButton: {
    marginTop: spacing.md,
  },
  groupsContainer: {
    flex: 1,
    minHeight: 400,
  },
  groupsList: {
    padding: spacing.md,
  },
}); 