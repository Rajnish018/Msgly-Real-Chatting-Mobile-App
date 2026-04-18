import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

export async function registerForPushNotificationsAsync() {

    // 1. Check if the device is a physical device
    if (!Device.isDevice) {
        console.log("Must use physical device for Push Notifications");
        return null;
    }

    // 2. Get existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // 3. Request permissions if not granted
    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    
    // 4. Check if permissions are granted
    if (finalStatus !== "granted") {
        console.log("Permission not granted for notifications");
        return null;
    }

    // 5. Get the push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const expoPushToken = tokenData.data;

    // 6. Set the notification channel (important)
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
        });
    }

    // 7. Return the push token
    return expoPushToken;
}
