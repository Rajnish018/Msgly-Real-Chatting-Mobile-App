import { getApp } from "@react-native-firebase/app";
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onTokenRefresh as subscribeToTokenRefresh,
  requestPermission,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import { Platform } from "react-native";

const getMessagingInstance = () => getMessaging(getApp());

if (Platform.OS !== "web") {
  setBackgroundMessageHandler(getMessagingInstance(), async (remoteMessage) => {
    console.log("Background message received:", remoteMessage);
  });
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === "web") {
    console.log("Push notifications are skipped on web");
    return null;
  }

  const messaging = getMessagingInstance();
  const authStatus = await requestPermission(messaging);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.log("Permission not granted for notifications");
    return null;
  }

  return await getToken(messaging);
}

export function onTokenRefresh(callback: (token: string) => void) {
  return subscribeToTokenRefresh(getMessagingInstance(), callback);
}
