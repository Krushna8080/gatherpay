import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { errorHandler } from './ErrorHandler';

export interface MediaUploadResult {
  uri: string;
  type: 'image' | 'screenshot';
  timestamp: Date;
}

export class MediaUploader {
  static async requestPermissions() {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access media library was denied');
      }
    }
  }

  static async pickImage(options: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  } = {}): Promise<MediaUploadResult> {
    try {
      await this.requestPermissions();

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [4, 3],
        quality: options.quality ?? 0.8,
      });

      if (result.canceled) {
        throw new Error('Image selection was cancelled');
      }

      // Since we're not using Firebase Storage, we'll return the local URI
      // In a production environment, you would upload this to Firebase Storage
      return {
        uri: result.assets[0].uri,
        type: 'image',
        timestamp: new Date(),
      };
    } catch (error) {
      errorHandler.handleError(error, 'MediaUploader');
      throw error;
    }
  }

  static async takeScreenshot(options: {
    quality?: number;
  } = {}): Promise<MediaUploadResult> {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access camera was denied');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: options.quality ?? 0.8,
      });

      if (result.canceled) {
        throw new Error('Screenshot capture was cancelled');
      }

      // In production, upload to Firebase Storage and return the URL
      return {
        uri: result.assets[0].uri,
        type: 'screenshot',
        timestamp: new Date(),
      };
    } catch (error) {
      errorHandler.handleError(error, 'MediaUploader');
      throw error;
    }
  }

  // Method to validate image dimensions and size
  static async validateImage(uri: string): Promise<boolean> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Check file size (max 5MB)
      if (blob.size > 5 * 1024 * 1024) {
        throw new Error('Image size exceeds 5MB limit');
      }

      return true;
    } catch (error) {
      errorHandler.handleError(error, 'MediaUploader');
      return false;
    }
  }

  // Utility method to get file extension from URI
  static getFileExtension(uri: string): string {
    return uri.split('.').pop()?.toLowerCase() || 'jpg';
  }

  // Method to generate a unique filename
  static generateFilename(type: 'image' | 'screenshot'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${type}_${timestamp}_${random}`;
  }
} 