// mobile/services/notifications.service.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { usersApi } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationsService {
  // ── Register for push notifications ──────────────────────

  static async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission denied');
      return null;
    }

    // Get Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00E676',
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'notification.wav',
        vibrationPattern: [0, 100],
      });

      await Notifications.setNotificationChannelAsync('bids', {
        name: 'Auction Bids',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 100, 500],
        lightColor: '#FF4757',
      });
    }

    // Save token to backend
    try {
      await usersApi.updateProfile({ push_token: token });
      console.log('Push token registered:', token.slice(0, 20) + '...');
    } catch (err) {
      console.warn('Failed to save push token to backend:', err);
    }

    return token;
  }

  // ── Handle notification tap (deep link) ──────────────────

  static setupNotificationHandlers() {
    // Foreground notification received
    const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received (foreground):', notification.request.identifier);
      // Update badge count, show in-app toast, etc.
    });

    // User tapped notification (background/killed)
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      NotificationsService.handleDeepLink(data);
    });

    return () => {
      foregroundSub.remove();
      responseSub.remove();
    };
  }

  // ── Deep link routing based on notification data ──────────

  static handleDeepLink(data: Record<string, any>) {
    const { type, chat_id, vehicle_id, auction_id, offer_id } = data;

    switch (type) {
      case 'message':
      case 'offer':
      case 'offer_accepted':
        if (chat_id) router.push(`/chat/${chat_id}`);
        break;

      case 'listing_approved':
      case 'price_drop':
        if (vehicle_id) router.push(`/listing/${vehicle_id}`);
        break;

      case 'auction_outbid':
      case 'auction_won':
        if (auction_id) router.push(`/auction/${auction_id}`);
        break;

      case 'search_alert':
        router.push('/search');
        break;

      default:
        router.push('/');
    }
  }

  // ── Badge management ─────────────────────────────────────

  static async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }

  static async setBadge(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  // ── Get last notification (app launched from killed) ─────

  static async getLastNotificationResponse() {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      NotificationsService.handleDeepLink(response.notification.request.content.data);
    }
  }
}

export default NotificationsService;
