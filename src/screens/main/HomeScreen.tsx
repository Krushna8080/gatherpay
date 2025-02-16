import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, FAB, Card, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing } from '../../theme';
import * as Location from 'expo-location';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useWallet } from '../../contexts/WalletContext';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'Home'>;
};

interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  targetAmount: number;
  status: 'open' | 'ordering' | 'ordered' | 'completed' | 'cancelled';
  createdBy: string;
  members: { [key: string]: boolean };
  location: {
    latitude: number;
    longitude: number;
    lastUpdated?: Date;
  };
  distance?: number; // Distance from user in meters
}

const MAX_DISTANCE = 5000; // 5km radius

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { user } = useAuth();
  const { balance } = useWallet();

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
      const nearbyGroups: Group[] = [];
      snapshot.forEach((doc) => {
        const groupData = { id: doc.id, ...doc.data() } as Group;
        
        // Calculate distance from user
        const distance = calculateDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          groupData.location.latitude,
          groupData.location.longitude
        );

        // Only include groups within 5km
        if (distance <= 5) {
          groupData.distance = distance;
          nearbyGroups.push(groupData);
        }
      });

      // Sort groups by distance
      nearbyGroups.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      setGroups(nearbyGroups);
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
    <Card style={styles.card} onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })}>
      <Card.Content>
        <Text variant="titleMedium">{item.name}</Text>
        <Text variant="bodyMedium">{item.description}</Text>
        <View style={styles.groupInfo}>
          <View style={styles.groupStats}>
            <Text variant="bodySmall">Members: {item.memberCount}</Text>
            <Text variant="bodySmall">Target: ₹{item.targetAmount}</Text>
          </View>
          <Text variant="bodySmall" style={styles.distance}>
            {formatDistance(item.distance)}
          </Text>
        </View>
      </Card.Content>
      <Card.Actions>
        <Button onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })}>
          View Details
        </Button>
      </Card.Actions>
    </Card>
  );

  const renderContent = () => {
    if (locationError) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{locationError}</Text>
          <Button mode="contained" onPress={getUserLocation} style={styles.retryButton}>
            Grant Location Permission
          </Button>
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Finding nearby groups...</Text>
        </View>
      );
    }

    if (groups.length === 0) {
      return (
        <View style={styles.centered}>
          <Text>No nearby groups found</Text>
          <Text style={styles.subText}>Create a new group to get started!</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={groups}
        renderItem={renderGroupCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={getUserLocation}
        refreshing={loading}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.walletInfo}>
          <Text variant="titleMedium" style={styles.walletBalance}>
            ₹{balance.toFixed(2)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon="wallet"
            size={24}
            onPress={() => navigation.navigate('Wallet')}
          />
          <IconButton
            icon="account"
            size={24}
            onPress={() => navigation.navigate('Profile')}
          />
        </View>
      </View>

      {renderContent()}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateGroup')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    elevation: 2,
  },
  walletInfo: {
    flex: 1,
    paddingLeft: spacing.sm,
  },
  walletBalance: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
  },
  list: {
    padding: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  groupInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  groupStats: {
    flex: 1,
  },
  distance: {
    color: colors.primary,
    fontWeight: 'bold',
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
}); 