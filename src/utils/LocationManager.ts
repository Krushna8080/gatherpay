import * as Location from 'expo-location';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { errorHandler } from './ErrorHandler';
import { locationPrivacyManager } from './LocationPrivacyManager';
import { notificationManager } from './NotificationManager';

const LOCATION_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const LOCATION_DISTANCE_THRESHOLD = 100; // 100 meters
const GEOFENCE_RADIUS = 500; // 500 meters for group proximity alerts

interface Geofence {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  type: 'group' | 'delivery';
  metadata: {
    groupId?: string;
    orderId?: string;
    name: string;
  };
}

export class LocationManager {
  private static instance: LocationManager;
  private locationSubscription: Location.LocationSubscription | null = null;
  private userId: string | null = null;
  private lastLocation: Location.LocationObject | null = null;
  private activeGeofences: Map<string, Geofence> = new Map();

  private constructor() {}

  static getInstance(): LocationManager {
    if (!LocationManager.instance) {
      LocationManager.instance = new LocationManager();
    }
    return LocationManager.instance;
  }

  async init(userId: string) {
    this.userId = userId;
    await locationPrivacyManager.init(userId);
    await this.requestPermissions();
    await this.startTracking();
  }

  private async requestPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      // Request background location for Android
      if (Platform.OS === 'android') {
        const { status: backgroundStatus } = 
          await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission denied');
        }
      }
    } catch (error) {
      errorHandler.handleError(error, 'LocationManager');
    }
  }

  private async startTracking() {
    if (!locationPrivacyManager.shouldShareLocation()) return;

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await this.updateUserLocation(location);

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: LOCATION_DISTANCE_THRESHOLD,
        },
        this.handleLocationUpdate
      );
    } catch (error) {
      errorHandler.handleError(error, 'LocationManager');
    }
  }

  private handleLocationUpdate = async (location: Location.LocationObject) => {
    try {
      if (this.shouldUpdateLocation(location)) {
        await this.updateUserLocation(location);
        await this.checkGeofences(location);
        this.lastLocation = location;
      }
    } catch (error) {
      errorHandler.handleError(error, 'LocationManager');
    }
  };

  private shouldUpdateLocation(newLocation: Location.LocationObject): boolean {
    if (!this.lastLocation) return true;

    const distance = this.calculateDistance(
      this.lastLocation.coords.latitude,
      this.lastLocation.coords.longitude,
      newLocation.coords.latitude,
      newLocation.coords.longitude
    );

    return distance >= LOCATION_DISTANCE_THRESHOLD;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private async updateUserLocation(location: Location.LocationObject) {
    if (!this.userId || !locationPrivacyManager.shouldShareLocation()) return;

    try {
      const userRef = doc(db, 'users', this.userId);
      const { latitude, longitude } = locationPrivacyManager.obscureLocation(
        location.coords.latitude,
        location.coords.longitude
      );

      await updateDoc(userRef, {
        location: {
          latitude,
          longitude,
          accuracy: location.coords.accuracy,
          timestamp: serverTimestamp(),
          precisionLevel: locationPrivacyManager.getLocationPrecision(),
        },
        lastLocationUpdate: serverTimestamp(),
      });
    } catch (error) {
      errorHandler.handleError(error, 'LocationManager');
    }
  }

  // Geofencing methods
  async addGeofence(geofence: Omit<Geofence, 'id'>): Promise<string> {
    const id = Math.random().toString(36).substring(7);
    const newGeofence: Geofence = { ...geofence, id };
    this.activeGeofences.set(id, newGeofence);
    
    // Check if already within geofence
    if (this.lastLocation) {
      this.checkSingleGeofence(newGeofence, this.lastLocation);
    }
    
    return id;
  }

  removeGeofence(id: string) {
    this.activeGeofences.delete(id);
  }

  private async checkGeofences(location: Location.LocationObject) {
    for (const geofence of this.activeGeofences.values()) {
      await this.checkSingleGeofence(geofence, location);
    }
  }

  private async checkSingleGeofence(geofence: Geofence, location: Location.LocationObject) {
    const distance = this.calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      geofence.latitude,
      geofence.longitude
    );

    if (distance <= geofence.radius) {
      // Inside geofence
      if (geofence.type === 'group' && locationPrivacyManager.shouldShareWithGroup(geofence.metadata.groupId!)) {
        await this.handleGroupProximity(geofence);
      } else if (geofence.type === 'delivery' && locationPrivacyManager.shouldShareWithDelivery()) {
        await this.handleDeliveryProximity(geofence);
      }
    }
  }

  private async handleGroupProximity(geofence: Geofence) {
    try {
      const groupRef = doc(db, 'groups', geofence.metadata.groupId!);
      const groupDoc = await getDoc(groupRef);
      
      if (groupDoc.exists() && groupDoc.data().status === 'open') {
        notificationManager.sendLocalNotification(
          'Nearby Group Found',
          `You're near ${geofence.metadata.name}. Open the app to join!`
        );
      }
    } catch (error) {
      errorHandler.handleError(error, 'LocationManager');
    }
  }

  private async handleDeliveryProximity(geofence: Geofence) {
    try {
      const orderRef = doc(db, 'orders', geofence.metadata.orderId!);
      const orderDoc = await getDoc(orderRef);
      
      if (orderDoc.exists() && orderDoc.data().status === 'delivering') {
        notificationManager.sendLocalNotification(
          'Delivery Update',
          `Your order from ${geofence.metadata.name} is nearby!`
        );
      }
    } catch (error) {
      errorHandler.handleError(error, 'LocationManager');
    }
  }

  async getCurrentLocation(): Promise<Location.LocationObject> {
    if (!locationPrivacyManager.shouldShareLocation()) {
      throw new Error('Location sharing is disabled in privacy settings');
    }

    try {
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
    } catch (error) {
      errorHandler.handleError(error, 'LocationManager');
      throw error;
    }
  }

  stopTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.userId = null;
    this.lastLocation = null;
    this.activeGeofences.clear();
    locationPrivacyManager.cleanup();
  }
}

export const locationManager = LocationManager.getInstance(); 