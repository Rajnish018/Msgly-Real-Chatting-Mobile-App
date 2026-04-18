import type { PushNotificationParams } from "../types.js";

export const sendPushNotification = async ({
  expoPushToken,
  title,
  body,
  data,
}: PushNotificationParams) => {
  if (!expoPushToken) return;

  if (!expoPushToken.startsWith("ExponentPushToken")) {
    console.log("Invalid expoPushToken:", expoPushToken);
    return;
  }

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data,
        priority: "high",
      }),
    });

    return await res.json();
  } catch (err: any) {
    console.log("Push send error:", err.message);
  }
};
