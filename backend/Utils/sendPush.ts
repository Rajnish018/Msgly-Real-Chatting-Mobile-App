import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/user.model.js";
import type { PushNotificationParams } from "../types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountFileName = "msgly-chatting-app-firebase-adminsdk-fbsvc-545e99854e.json";

const parseServiceAccountJson = (value: string) => {
  const normalizedValue = value.trim();
  const jsonString = normalizedValue.startsWith("{")
    ? normalizedValue
    : Buffer.from(normalizedValue, "base64").toString("utf8");

  return JSON.parse(jsonString);
};

const loadFirebaseServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.log("Firebase service account loaded from FIREBASE_SERVICE_ACCOUNT_JSON.");
    return parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    console.log("Firebase service account loaded from FIREBASE_SERVICE_ACCOUNT_BASE64.");
    return parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
  }

  const serviceAccountCandidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.resolve(process.cwd(), serviceAccountFileName),
    path.resolve(process.cwd(), "backend", serviceAccountFileName),
    path.resolve(__dirname, "../", serviceAccountFileName),
    path.resolve(__dirname, "../../", serviceAccountFileName),
  ].filter(Boolean) as string[];

  for (const candidate of serviceAccountCandidates) {
    const resolvedPath = path.resolve(candidate);
    const exists = fs.existsSync(resolvedPath);
    console.log(`Firebase service account path check: ${resolvedPath} | Exists: ${exists}`);

    if (exists) {
      return JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
    }
  }

  throw new Error(
    "Firebase credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_BASE64, or FIREBASE_SERVICE_ACCOUNT_PATH."
  );
};

/**
 * Ensures Firebase is initialized once.
 * Note: Call this and 'await' it before your server starts listening.
 */
export async function initializeFirebase() {
  if (admin.apps.length > 0) return;

  try {
    const serviceAccount = loadFirebaseServiceAccount();

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
