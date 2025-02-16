import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { errorHandler } from './ErrorHandler';
import { AppError } from './ErrorHandler';

export interface LocationPrivacySettings {
  shareLocation: boolean;
  shareWithGroups: boolean;
  shareWithDelivery: boolean;
  precisionLevel: 'exact' | 'approximate' | 'area';
  visibleToNearbyGroups: boolean;
  maxVisibilityRadius: number; // in meters
  retentionPeriod: number; // in hours
}

const DEFAULT_PRIVACY_SETTINGS: LocationPrivacySettings = {
  shareLocation: true,
  shareWithGroups: true,
  shareWithDelivery: true,
  precisionLevel: 'exact',
  visibleToNearbyGroups: true,
  maxVisibilityRadius: 5000, // 5km
  retentionPeriod: 24, // 24 hours
};

export class LocationPrivacyManager {
  private static instance: LocationPrivacyManager;
  private userId: string | null = null;
  private settings: LocationPrivacySettings = DEFAULT_PRIVACY_SETTINGS;

  private constructor() {}

  static getInstance(): LocationPrivacyManager {
    if (!LocationPrivacyManager.instance) {
      LocationPrivacyManager.instance = new LocationPrivacyManager();
    }
    return LocationPrivacyManager.instance;
  }

  async init(userId: string) {
    this.userId = userId;
    await this.loadSettings();
  }

  private async loadSettings() {
    if (!this.userId) return;

    try {
      const userRef = doc(db, 'users', this.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists() && userDoc.data().privacySettings) {
        this.settings = {
          ...DEFAULT_PRIVACY_SETTINGS,
          ...userDoc.data().privacySettings,
        };
      } else {
        // Initialize default settings if none exist
        await this.updateSettings(DEFAULT_PRIVACY_SETTINGS);
      }
    } catch (error) {
      errorHandler.handleError(error instanceof Error ? error : new AppError('Failed to load privacy settings', 'PRIVACY_SETTINGS_ERROR'), 'LocationPrivacyManager');
    }
  }

  async updateSettings(newSettings: Partial<LocationPrivacySettings>) {
    if (!this.userId) return;

    try {
      const userRef = doc(db, 'users', this.userId);
      await updateDoc(userRef, {
        privacySettings: {
          ...this.settings,
          ...newSettings,
        },
      });
      this.settings = { ...this.settings, ...newSettings };
    } catch (error) {
      errorHandler.handleError(error instanceof Error ? error : new AppError('Failed to update privacy settings', 'PRIVACY_SETTINGS_ERROR'), 'LocationPrivacyManager');
    }
  }

  getSettings(): LocationPrivacySettings {
    return { ...this.settings };
  }

  // Helper methods for location privacy
  shouldShareLocation(): boolean {
    return this.settings.shareLocation;
  }

  shouldShareWithGroup(groupId: string): boolean {
    return this.settings.shareWithGroups;
  }

  shouldShareWithDelivery(): boolean {
    return this.settings.shareWithDelivery;
  }

  getLocationPrecision(): 'exact' | 'approximate' | 'area' {
    return this.settings.precisionLevel;
  }

  // Method to obscure location based on privacy settings
  obscureLocation(latitude: number, longitude: number): { latitude: number; longitude: number } {
    switch (this.settings.precisionLevel) {
      case 'exact':
        return { latitude, longitude };
      
      case 'approximate':
        // Round to 3 decimal places (roughly 100m accuracy)
        return {
          latitude: Math.round(latitude * 1000) / 1000,
          longitude: Math.round(longitude * 1000) / 1000,
        };
      
      case 'area':
        // Round to 2 decimal places (roughly 1km accuracy)
        return {
          latitude: Math.round(latitude * 100) / 100,
          longitude: Math.round(longitude * 100) / 100,
        };
    }
  }

  isWithinVisibilityRadius(distance: number): boolean {
    return distance <= this.settings.maxVisibilityRadius;
  }

  cleanup() {
    this.userId = null;
    this.settings = DEFAULT_PRIVACY_SETTINGS;
  }
}

export const locationPrivacyManager = LocationPrivacyManager.getInstance(); 