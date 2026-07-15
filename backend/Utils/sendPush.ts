import admin from "firebase-admin";
import User from "../models/user.model.js";
import type { PushNotificationParams } from "../types.js";

/**
 * Load Firebase credentials from Render Environment Variable.
 *
 * Render Environment Variable:
 * FIREBASE_SERVICE_ACCOUNT
 *
 * Value:
 * Paste the COMPLETE Firebase service account JSON.
 */
const loadFirebaseServiceAccount = () => {
  const credentials = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!credentials) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT environment variable."
    );
  }

  try {
    const serviceAccount = JSON.parse(credentials);

    return {
      ...serviceAccount,
      // Restore newlines in private key if stored as escaped characters
      private_key: serviceAccount.private_key.replace(/\\n/g, "\n"),
    };
  } catch (error) {
    console.error("Invalid Firebase service account:", error);

    throw new Error(
      "Invalid FIREBASE_SERVICE_ACCOUNT JSON."
    );
  }
};

/**
 * Initialize Firebase Admin SDK only once.
 */
export async function initializeFirebase() {
  if (admin.apps.length) {
    return;
  }

  try {
    const serviceAccount = loadFirebaseServiceAccount();

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✅ Firebase Admin SDK initialized successfully.");
  } catch (err) {
    console.error("❌ Failed to initialize Firebase Admin SDK");
    console.error(err);
    process.exit(1);
  }
}

/**
 * Send Push Notification
 */
export const sendPushNotification = async ({
  fcmToken,
  title,
  body,
  data,
  userId,
}: PushNotificationParams) => {
  const normalizedToken =
    typeof fcmToken === "string"
      ? fcmToken.trim()
      : "";

  if (!normalizedToken) {
    console.warn("⚠️ Push notification skipped. No FCM token.");
    return {
      success: false,
      error: "No FCM token",
    };
  }

  /**
   * Firebase requires all data values to be strings.
   */
  const sanitizedData: Record<string, string> = {};

  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        sanitizedData[key] =
          typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
      }
    });
  }

  try {
    const message: admin.messaging.Message = {
      token: normalizedToken,

      notification: {
        title: title || "New Message",
        body: body || "",
      },

      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "high_importance_channel",
        },
      },

      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true,
          },
        },
      },

      data: sanitizedData,
    };

    console.log(`📤 Sending push notification to user: ${userId}`);

    const response = await admin.messaging().send(message);

    console.log("✅ Push notification sent:", response);

    return {
      success: true,
      messageId: response,
    };
  } catch (err: any) {
    const errorCode = err?.code || "unknown";
    const errorMessage = err?.message || "Unknown error";

    console.error(
      `❌ Firebase Error [${errorCode}]`,
      errorMessage
    );

    const invalidTokenErrors = [
      "messaging/registration-token-not-registered",
      "messaging/invalid-registration-token",
      "messaging/invalid-argument",
    ];

    if (
      userId &&
      invalidTokenErrors.includes(errorCode)
    ) {
      console.warn(
        `Removing invalid FCM token for user ${userId}`
      );

      await User.findByIdAndUpdate(userId, {
        fcmToken: null,
      });
    }

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
    };
  }
};