import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { errorHandler } from './ErrorHandler';

// Configure default notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationManager {
  private static instance: NotificationManager;
  private notificationListener: any;
  private responseListener: any;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async init(userId: string) {
    if (this.initialized) return;

    try {
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }

      const token = await this.registerForPushNotifications();
      if (token) {
        await this.updatePushToken(userId, token);
      }

      this.setupNotificationListeners();
      this.initialized = true;
    } catch (error: any) {
      errorHandler.handleError(error, 'NotificationManager');
    }
  }

  private async setupAndroidChannel() {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2196F3',
    });
  }

  private async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log('Push Notifications are not available on emulator');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        throw new Error('Failed to get push notification permissions');
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      return token;
    } catch (error: any) {
      errorHandler.handleError(error, 'NotificationManager');
      return null;
    }
  }

  private async updatePushToken(userId: string, token: string) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushToken: token,
        lastTokenUpdate: new Date(),
        platform: Platform.OS,
      });
    } catch (error: any) {
      errorHandler.handleError(error, 'NotificationManager');
    }
  }

  private setupNotificationListeners() {
    // Handle notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotification
    );

    // Handle notification response when app is in background
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse
    );
  }

  private handleNotification = (notification: Notifications.Notification) => {
    // Handle foreground notifications
    console.log('Notification received:', notification);
    // You can add custom handling logic here
  };

  private handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    // Handle notification tap/interaction
    const data = response.notification.request.content.data;
    console.log('Notification response:', data);
    // You can add navigation or other interaction handling here
  };

  async sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>,
    options: {
      sound?: boolean;
      badge?: number;
      priority?: Notifications.AndroidNotificationPriority;
    } = {}
  ) {
    try {
      const notificationContent: Notifications.NotificationRequestInput = {
        content: {
          title,
          body,
          data: data || {},
          sound: options.sound !== false,
          badge: options.badge,
          priority: options.priority || Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // null means show immediately
      };

      await Notifications.scheduleNotificationAsync(notificationContent);
    } catch (error: any) {
      errorHandler.handleError(error, 'NotificationManager');
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      return 0;
    }
  }

  async setBadgeCount(count: number) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error: any) {
      errorHandler.handleError(error, 'NotificationManager');
    }
  }

  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await this.setBadgeCount(0);
    } catch (error: any) {
      errorHandler.handleError(error, 'NotificationManager');
    }
  }

  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    this.initialized = false;
  }
}

export const notificationManager = NotificationManager.getInstance(); 