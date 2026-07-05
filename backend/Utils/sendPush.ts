import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/user.model.js";
import type { PushNotificationParams } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Ensures Firebase is initialized once.
 * Note: Call this and 'await' it before your server starts listening.
 */
export async function initializeFirebase() {
  if (admin.apps.length > 0) return;

  console.log("--- DEBUG: Starting Firebase Initialization ---");
  
  try {
    const serviceAccountCandidates = [
      path.resolve(__dirname, "../msgly-chatting-app-firebase-adminsdk-fbsvc-545e99854e.json"),
      path.resolve(__dirname, "../../msgly-chatting-app-firebase-adminsdk-fbsvc-545e99854e.json"),
    ];

    const serviceAccountPath = serviceAccountCandidates.find((candidate) => {
      const exists = fs.existsSync(candidate);
      console.log(`DEBUG: Path check: ${candidate} | Exists: ${exists}`);
      return exists;
    });

    if (!serviceAccountPath) {
      throw new Error("Firebase service account JSON not found in any candidate path.");
    }

    // Using dynamic import for JSON assertion
    const { default: serviceAccount } = await import(serviceAccountPath, {
      assert: { type: "json" },
    });

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✅ Firebase Admin SDK initialized for FCM V1");
  } catch (err) {
    console.error("❌ Failed to initialize Firebase Admin SDK:", err);
    process.exit(1); // Critical failure
  }
}

/**
 * Sends a push notification with specific configs for Android and iOS
 */
export const sendPushNotification = async ({
  fcmToken,
  title,
  body,
  data,
  userId,
}: PushNotificationParams) => {
  const normalizedToken = typeof fcmToken === "string" ? fcmToken.trim() : "";

  if (!normalizedToken) {
    console.warn("DEBUG: Notification skipped. No token provided.");
    return { success: false, error: "No token" };
  }

  // --- FIX: Sanitize Data Payload ---
  // FCM V1 requires all keys and values in the 'data' object to be strings.
  const sanitizedData: Record<string, string> = {};
  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // If the value is an object (like a sender object), stringify it.
        // Otherwise, force it to a string.
        sanitizedData[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
      }
    });
  }

  try {
    // Constructing the V1 Payload using the official SDK type
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
          // Removed clickAction: "FLUTTER_NOTIFICATION_CLICK" 
          // Notifee in React Native handles clicks via its own internal system.
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
      // Essential: Pass the sanitized data record
      data: sanitizedData,
    };

    console.log(`DEBUG: Attempting send to user ${userId}...`);
    
    const response = await admin.messaging().send(message);
    
    console.log("✅ FCM V1 Success:", response);
    return { success: true, messageId: response };

  } catch (err: any) {
    const errorCode = err?.code || "unknown";
    const errorMessage = err?.message || "Unknown error";

    console.error(`❌ FCM V1 Error [${errorCode}]:`, errorMessage);

    const deadTokenCodes = [
      "messaging/registration-token-not-registered",
      "messaging/invalid-registration-token",
      "messaging/invalid-argument",
    ];

    if (deadTokenCodes.includes(errorCode)) {
      console.warn(`Cleaning up dead token for user: ${userId}`);
      if (userId) {
        await User.findByIdAndUpdate(userId, { fcmToken: null });
      }
    }

    return { success: false, error: errorMessage, code: errorCode };
  }
};