import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/user.model.js";
import { initializeFirebase, sendPushNotification } from "../Utils/sendPush.js";

dotenv.config();



async function debugNotification() {
  try {
    console.log("--- 🛠️ Starting Notification Debug ---");

    // 1. Connect to MongoDB (needed to fetch user tokens)
    await mongoose.connect(process.env.MONGO_URI || "");
    console.log("✅ Database connected");

    // 2. Initialize Firebase
    await initializeFirebase();

    // 3. Find a target user
    // Replace 'USER_EMAIL_OR_ID' with a real value from your DB
    const user = await User.findOne({ email: "rajnish.kumar018001@gmail.com" }); 

    if (!user || !user.fcmToken) {
      console.error("❌ Error: User not found or has no FCM token in DB.");
      process.exit(1);
    }

    console.log(`📡 Sending test notification to: ${user.email}`);
    console.log(`🔑 Token: ${user.fcmToken.substring(0, 15)}...`);

    // 4. Trigger the notification
    const result = await sendPushNotification({
      fcmToken: user.fcmToken,
      title: "Debug Test",
      body: "If you see this, FCM V1 is working! 🚀",
      userId: user._id.toString(),
      data: {
        screen: "chat",
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      }
    });

    if (result.success) {
      console.log("🎉 SUCCESS: Notification sent successfully.");
      console.log("Message ID:", result.messageId);
    } else {
      console.error("🛑 FAILED: Notification could not be sent.");
      console.error("Error Detail:", result.error);
    }

  } catch (error) {
    console.error("💥 CRITICAL SCRIPT ERROR:", error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

debugNotification();