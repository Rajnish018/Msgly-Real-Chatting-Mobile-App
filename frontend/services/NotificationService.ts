import { getApp } from "@react-native-firebase/app";
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  requestPermission,
  type FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from 'react-native';

import { createDefaultUserSettings } from '@/constants/userSettings';
import { showForegroundNotification } from '@/services/foregroundNotificationBridge';
import type { AppUserSettings } from "@/types";

const USER_SETTINGS_KEY = "userSettings";
const NOTIFICATIONS_KEY = "notificationsEnabled";
const MUTED_KEY = "mutedConversationIds";

let notifee: any = null;
let AndroidImportance: any = null;
let EventType: any = null;

if (Platform.OS !== 'web') {
  try {
    const notifeeModule = require('@notifee/react-native');
    notifee = notifeeModule.default;
    AndroidImportance = notifeeModule.AndroidImportance;
    EventType = notifeeModule.EventType;
  } catch (error) {
    console.warn('[NotificationService] Notifee native module is unavailable in this build.', error);
  }
}

const getMessagingInstance = () => getMessaging(getApp());

class NotificationService {
  private unsubscribeOnMessage: (() => void) | null = null;
  private unsubscribeForegroundEvent: (() => void) | null = null;
  private unsubscribeNotificationOpenedApp: (() => void) | null = null;

  async initialize() {
    if (Platform.OS === 'web') return;

    const hasPermission = await this.requestUserPermission();
    if (!hasPermission) {
      console.log('[NotificationService] Notification permissions denied by user.');
      return;
    }

    await this.createDefaultChannels();
    this.setupListeners();
    await this.checkInitialNotification();
  }

  private async requestUserPermission(): Promise<boolean> {
    try {
      const authStatus = await requestPermission(getMessagingInstance());
      return (
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL
      );
    } catch (error) {
      console.error('[NotificationService] Error requesting permission:', error);
      return false;
    }
  }

  private async createDefaultChannels() {
    if (Platform.OS === 'android' && notifee) {
      try {
        await this.ensureAndroidChannel("messages-default-default", {
          tone: "default",
          vibrate: "default",
          highPriority: true,
        });
      } catch (error) {
        console.error('[NotificationService] Error creating channel:', error);
      }
    }
  }

  private async getNotificationPreferences(data?: Record<string, any>) {
    const [notificationsEnabledRaw, mutedRaw, settingsRaw] = await Promise.all([
      AsyncStorage.getItem(NOTIFICATIONS_KEY),
      AsyncStorage.getItem(MUTED_KEY),
      AsyncStorage.getItem(USER_SETTINGS_KEY),
    ]);

    const notificationsEnabled = notificationsEnabledRaw !== "false";
    let mutedConversationIds: string[] = [];
    let parsedSettings: Partial<AppUserSettings> = {};

    try {
      mutedConversationIds = mutedRaw ? JSON.parse(mutedRaw) : [];
    } catch {
      mutedConversationIds = [];
    }

    try {
      parsedSettings = settingsRaw ? JSON.parse(settingsRaw) : {};
    } catch {
      parsedSettings = {};
    }
    const defaults = createDefaultUserSettings();
    const settings: AppUserSettings = {
      ...defaults,
      ...parsedSettings,
      notifications: {
        ...defaults.notifications,
        ...(parsedSettings.notifications || {}),
        messages: {
          ...defaults.notifications.messages,
          ...(parsedSettings.notifications?.messages || {}),
        },
        groups: {
          ...defaults.notifications.groups,
          ...(parsedSettings.notifications?.groups || {}),
        },
        calls: {
          ...defaults.notifications.calls,
          ...(parsedSettings.notifications?.calls || {}),
        },
      },
    };
    const isGroup = data?.conversationType === "group" || data?.type === "group";
    const channelSettings = isGroup ? settings.notifications.groups : settings.notifications.messages;

    return {
      notificationsEnabled,
      isConversationMuted:
        !!data?.conversationId &&
        Array.isArray(mutedConversationIds) &&
        mutedConversationIds.map(String).includes(String(data.conversationId)),
      conversationTones: settings.notifications.conversationTones,
      tone: channelSettings.tone,
      vibrate: channelSettings.vibrate,
      highPriority: channelSettings.highPriority,
    };
  }

  private async ensureAndroidChannel(
    channelId: string,
    options: { tone: string; vibrate: string; highPriority: boolean }
  ) {
    if (Platform.OS !== "android" || !notifee) return channelId;

    await notifee.createChannel({
      id: channelId,
      name: "Chat Messages",
      lights: true,
      vibration: options.vibrate !== "off",
      sound: options.tone === "none" ? undefined : "default",
      importance: options.highPriority
        ? AndroidImportance?.HIGH || 4
        : AndroidImportance?.DEFAULT || 3,
    });

    return channelId;
  }

  private setupListeners() {
    this.unsubscribeOnMessage?.();
    this.unsubscribeForegroundEvent?.();
    this.unsubscribeNotificationOpenedApp?.();

    // 1. Listen for incoming FCM messages while app is open & active (Foreground)
    this.unsubscribeOnMessage = onMessage(getMessagingInstance(), async (remoteMessage) => {
      console.log('[NotificationService] Foreground FCM received:', remoteMessage.messageId);
      await this.displayLocalNotification(remoteMessage);
    });

    if (!notifee) return;

    // 2. Handle taps on native notifications displayed while app is in foreground
    this.unsubscribeForegroundEvent = notifee.onForegroundEvent(({ type, detail }: any) => {
      if (type === EventType.PRESS && detail.notification) {
        this.handleNotificationTap(detail.notification.data);
      }
    });

    // 3. Handle taps when app is running in the background (FCM-native link)
    this.unsubscribeNotificationOpenedApp = onNotificationOpenedApp(getMessagingInstance(), (remoteMessage) => {
      console.log('[NotificationService] App opened from background state:', remoteMessage.messageId);
      this.handleNotificationTap(remoteMessage.data);
    });
  }

  /**
   * Evaluates if the app was opened from a completely killed (cold start) state 
   * via a system tray notification tap.
   */
  private async checkInitialNotification() {
    // Check FCM initial state
    const initialMessage = await getInitialNotification(getMessagingInstance());
    if (initialMessage) {
      console.log('[NotificationService] App opened from killed state (FCM):', initialMessage.messageId);
      this.handleNotificationTap(initialMessage.data);
      return;
    }

    // Check Notifee initial state
    if (notifee) {
      const initialNotifeeDetail = await notifee.getInitialNotification();
      if (initialNotifeeDetail?.notification) {
        console.log('[NotificationService] App opened from killed state (Notifee):', initialNotifeeDetail.notification.id);
        this.handleNotificationTap(initialNotifeeDetail.notification.data);
      }
    }
  }

  /**
   * Entry point for rendering a notification. It prioritizes the custom designed, 
   * premium React Native in-app banner before falling back to system tray delivery.
   */
  async displayLocalNotification(remoteMessage: FirebaseMessagingTypes.RemoteMessage) {
    const { notification, data } = remoteMessage;
    const preferences = await this.getNotificationPreferences(data);

    if (!preferences.notificationsEnabled || preferences.isConversationMuted) {
      return;
    }
    
    // Safely extract text nodes supporting both standard FCM blocks and data-only FCM blocks
    const title = String(notification?.title || data?.title || 'New Notification');
    const body = String(notification?.body || data?.body || '');
    const avatarUrl = data?.avatar || data?.senderAvatar || data?.image || null;
    const tag = data?.conversationName ? 'NEW CHAT' : 'NEW MESSAGE';
    const safeData = Object.fromEntries(
      Object.entries(data || {}).map(([key, value]) => [key, String(value)])
    );
    const channelId = `messages-${preferences.tone}-${preferences.vibrate}`;

    // Attempt to display our custom custom in-app banner designed earlier
    const didRenderCustomBanner = showForegroundNotification({
      id: remoteMessage.messageId || String(Date.now()),
      title,
      body,
      avatarUrl: avatarUrl ? String(avatarUrl) : null,
      tag: String(tag),
      data: safeData,
    });

    if (!notifee) return;
    if (preferences.conversationTones === false || preferences.tone === "none") {
      if (didRenderCustomBanner) return;
    }

    await this.ensureAndroidChannel(channelId, preferences);

    // Fallback: Display a native OS system notification (if app is minimized, or react banner failed)
    await notifee.displayNotification({
      title,
      body,
      data: safeData,
      android: {
        channelId,
        importance: preferences.highPriority
          ? AndroidImportance?.HIGH || 4
          : AndroidImportance?.DEFAULT || 3,
        smallIcon: 'ic_launcher', // Ensure this resource exists in your android drawable folder!
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: preferences.tone === "none" ? undefined : "default",
        foregroundPresentationOptions: {
          badge: true,
          sound: preferences.tone !== "none",
          banner: !didRenderCustomBanner,
          list: true,
        },
      },
    });
  }

  /**
   * Unified, central pipeline for routing users to screens on notification tap.
   */
  public handleNotificationTap(data: any) {
    if (!data) return;
    console.log('[NotificationService] Handling action routing with metadata:', data);

    // E.g., Route to specific chat rooms or action item screens:
    // if (data.chatId) {
    //   navigationRef.navigate('ChatRoom', { id: data.chatId });
    // }
  }

  cleanup() {
    this.unsubscribeOnMessage?.();
    this.unsubscribeForegroundEvent?.();
    this.unsubscribeNotificationOpenedApp?.();
    this.unsubscribeOnMessage = null;
    this.unsubscribeForegroundEvent = null;
    this.unsubscribeNotificationOpenedApp = null;
  }

  async getDeviceToken(): Promise<string | null> {
    try {
      return await getToken(getMessagingInstance());
    } catch (error) {
      console.error('[NotificationService] Error fetching APNS/FCM device token:', error);
      return null;
    }
  }
}

export default new NotificationService();
