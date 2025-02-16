import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { errorHandler, AppError } from './ErrorHandler';
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

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
  precisionLevel: 'exact' | 'approximate' | 'area';
}

export class LocationManager {
  private static instance: LocationManager;
  private locationSubscription: Location.LocationSubscription | null = null;
  private userId: string | null = null;
  private lastLocation: Location.LocationObject | null = null;
  private activeGeofences: Map<string, Geofence> = new Map();
  private isTracking: boolean = false;

  private constructor() {}

  static getInstance(): LocationManager {
    if (!LocationManager.instance) {
      LocationManager.instance = new LocationManager();
    }
    return LocationManager.instance;
  }

  async init(userId: string): Promise<void> {
    try {
      this.userId = userId;
      await locationPrivacyManager.init(userId);
      const hasPermissions = await this.requestPermissions();
      
      if (hasPermissions) {
        await this.startTracking();
      } else {
        throw new AppError('Location permissions not granted', 'LOCATION_PERMISSION_DENIED');
      }
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new AppError('Failed to initialize location manager', 'LOCATION_INIT_ERROR'),
        'LocationManager.init'
      );
    }
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        errorHandler.handleError(
          new AppError('Location permission denied', 'LOCATION_PERMISSION_DENIED'),
          'LocationManager.requestPermissions'
        );
        return false;
      }

      if (Platform.OS === 'android') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission denied');
        }
      }

      return true;
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new AppError('Failed to request permissions', 'PERMISSION_REQUEST_ERROR'),
        'LocationManager.requestPermissions'
      );
      return false;
    }
  }

  private async startTracking(): Promise<void> {
    if (this.isTracking || !locationPrivacyManager.shouldShareLocation()) {
      return;
    }

    try {
      this.isTracking = true;
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      await this.updateUserLocation(location);

      if (this.locationSubscription) {
        this.locationSubscription.remove();
      }

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: LOCATION_DISTANCE_THRESHOLD,
        },
        this.handleLocationUpdate
      );
    } catch (error) {
      this.isTracking = false;
      errorHandler.handleError(
        error instanceof Error ? error : new AppError('Failed to start location tracking', 'TRACKING_START_ERROR'),
        'LocationManager.startTracking'
      );
    }
  }

  private handleLocationUpdate = async (location: Location.LocationObject): Promise<void> => {
    try {
      if (this.shouldUpdateLocation(location)) {
        await this.updateUserLocation(location);
        await this.checkGeofences(location);
        this.lastLocation = location;
      }
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new AppError('Failed to handle location update', 'LOCATION_UPDATE_ERROR'),
        'LocationManager.handleLocationUpdate'
      );
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

  private async updateUserLocation(location: Location.LocationObject): Promise<void> {
    if (!this.userId || !locationPrivacyManager.shouldShareLocation()) return;

    try {
      const userRef = doc(db, 'users', this.userId);
      const { latitude, longitude } = locationPrivacyManager.obscureLocation(
        location.coords.latitude,
        location.coords.longitude
      );

      const locationData: LocationData = {
        latitude,
        longitude,
        accuracy: location.coords.accuracy || undefined,
        timestamp: new Date(),
        precisionLevel: locationPrivacyManager.getLocationPrecision(),
      };

      // Update both location and lastLocationUpdate in a single update
      const updateData = {
        location: locationData,
        lastLocationUpdate: serverTimestamp(),
        // Add metadata to help with debugging
        lastLocationUpdateDevice: Platform.OS,
        lastLocationUpdateVersion: '1.0.0',
      };

      await updateDoc(userRef, updateData);

      // Verify the update was successful
      const updatedDoc = await getDoc(userRef);
      if (!updatedDoc.exists() || !updatedDoc.data()?.location) {
        throw new AppError('Location update failed to persist', 'LOCATION_UPDATE_FAILED');
      }

    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new AppError('Failed to update user location', 'LOCATION_UPDATE_ERROR'),
        'LocationManager.updateUserLocation'
      );
      // Retry once after a short delay if the update failed
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.updateUserLocation(location);
      } catch (retryError) {
        errorHandler.handleError(
          retryError instanceof Error ? retryError : new AppError('Failed to update user location after retry', 'LOCATION_UPDATE_RETRY_ERROR'),
          'LocationManager.updateUserLocation'
        );
      }
    }
  }

  async addGeofence(geofence: Omit<Geofence, 'id'>): Promise<string> {
    const id = Math.random().toString(36).substring(7);
    const newGeofence: Geofence = { ...geofence, id };
    this.activeGeofences.set(id, newGeofence);
    
    if (this.lastLocation) {
      await this.checkSingleGeofence(newGeofence, this.lastLocation);
    }
    
    return id;
  }

  removeGeofence(id: string): void {
    this.activeGeofences.delete(id);
  }

  private async checkGeofences(location: Location.LocationObject): Promise<void> {
    const promises = Array.from(this.activeGeofences.values()).map(geofence => 
      this.checkSingleGeofence(geofence, location)
    );
    await Promise.all(promises);
  }

  private async checkSingleGeofence(geofence: Geofence, location: Location.LocationObject): Promise<void> {
    try {
      const distance = this.calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        geofence.latitude,
        geofence.longitude
      );

      if (distance <= geofence.radius) {
        if (geofence.type === 'group' && 
            geofence.metadata.groupId && 
            locationPrivacyManager.shouldShareWithGroup(geofence.metadata.groupId)) {
          await this.handleGroupProximity(geofence);
        } else if (geofence.type === 'delivery' && locationPrivacyManager.shouldShareWithDelivery()) {
          await this.handleDeliveryProximity(geofence);
        }
      }
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new AppError('Failed to check geofence', 'GEOFENCE_CHECK_ERROR'),
        'LocationManager.checkSingleGeofence'
      );
    }
  }

  private async handleGroupProximity(geofence: Geofence): Promise<void> {
    try {
      if (!geofence.metadata.groupId) return;

      const groupRef = doc(db, 'groups', geofence.metadata.groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (groupDoc.exists() && groupDoc.data().status === 'open') {
        await notificationManager.sendLocalNotification(
          'Nearby Group Found',
          `You're near ${geofence.metadata.name}. Open the app to join!`,
          { groupId: geofence.metadata.groupId }
        );
      }
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new AppError('Failed to handle group proximity', 'GROUP_PROXIMITY_ERROR'),
        'LocationManager.handleGroupProximity'
      );
    }
  }

  private async handleDeliveryProximity(geofence: Geofence): Promise<void> {
    try {
      if (!geofence.metadata.orderId) return;

      const orderRef = doc(db, 'orders', geofence.metadata.orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (orderDoc.exists() && orderDoc.data().status === 'delivering') {
        await notificationManager.sendLocalNotification(
          'Delivery Update',
          `Your order from ${geofence.metadata.name} is nearby!`,
          { orderId: geofence.metadata.orderId }
        );
      }
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new AppError('Failed to handle delivery proximity', 'DELIVERY_PROXIMITY_ERROR'),
        'LocationManager.handleDeliveryProximity'
      );
    }
  }

  async getCurrentLocation(): Promise<Location.LocationObject> {
    if (!locationPrivacyManager.shouldShareLocation()) {
      throw new AppError('Location sharing is disabled in privacy settings', 'LOCATION_SHARING_DISABLED');
    }

    try {
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
    } catch (error) {
      const appError = error instanceof Error 
        ? new AppError(error.message, 'LOCATION_ERROR')
        : new AppError('Failed to get current location', 'LOCATION_ERROR');
      errorHandler.handleError(appError, 'LocationManager.getCurrentLocation');
      throw appError;
    }
  }

  async stopTracking(): Promise<void> {
    try {
      if (this.locationSubscription) {
        await this.locationSubscription.remove();
        this.locationSubscription = null;
      }
      this.userId = null;
      this.lastLocation = null;
      this.activeGeofences.clear();
      this.isTracking = false;
      await locationPrivacyManager.cleanup();
    } catch (error) {
      errorHandler.handleError(
        error instanceof Error ? error : new AppError('Failed to stop location tracking', 'TRACKING_STOP_ERROR'),
        'LocationManager.stopTracking'
      );
    }
  }
}

export const locationManager = LocationManager.getInstance(); 