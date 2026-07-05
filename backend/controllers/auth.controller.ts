import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Block from "../models/block.model.js";
import {
  createDefaultUserSettings,
  mergeUserSettings,
} from "../Utils/userSettings.js";
import {
  getAccountDeletionGraceDays,
  getScheduledDeletionDate,
  permanentlyDeleteAccountByUserId,
  purgeExpiredDeactivatedAccounts,
} from "../Utils/accountLifecycle.js";
import { sendJsonExportMail } from "../Utils/mailer.js";
import { sendPushNotification } from "../Utils/sendPush.js";
import { generateToken } from "../Utils/token.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { invalidateUserBlockCache, populateUserBlocks } from "../Utils/blockCache.js";

const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase();

const getResolvedSettings = (user: any) =>
  mergeUserSettings(createDefaultUserSettings(), user?.settings || {});

const buildSettingsResponse = (user: any) => {
  const settings = getResolvedSettings(user);

  return {
    email: user.email,
    language: user.language || "en",
    notificationsEnabled: user.notificationsEnabled ?? true,
    mutedConversationIds: (user.mutedConversations || []).map((id: any) => id.toString()),
    settings,
  };
};

const sanitizeUser = (user: any) => ({
  id: user._id?.toString?.() || user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || "",
  bio: user.bio || "",
  privateProfile: user.privateProfile ?? false,
  showOnlineStatus: user.showOnlineStatus ?? true,
  notificationsEnabled: user.notificationsEnabled ?? true,
  accountStatus: user.accountStatus ?? "active",
  deactivatedAt: user.deactivatedAt ?? null,
  scheduledDeletionAt: user.scheduledDeletionAt ?? null,
  publicEncryptionKey: user.publicEncryptionKey ?? null,
  encryptedPrivateKeyBackup:
    user.encryptedPrivateKeyBackup?.ciphertext && user.encryptedPrivateKeyBackup?.nonce
      ? {
          ciphertext: user.encryptedPrivateKeyBackup.ciphertext,
          nonce: user.encryptedPrivateKeyBackup.nonce,
          updatedAt: user.encryptedPrivateKeyBackup.updatedAt ?? null,
        }
      : null,
  settings: getResolvedSettings(user),
  blockedUsers: user.blockedUsers??[],
});

const normalizeEncryptedPrivateKeyBackup = (backup: any) => {
  const ciphertext = String(backup?.ciphertext || "").trim();
  const nonce = String(backup?.nonce || "").trim();

  if (!ciphertext || !nonce) return null;

  return {
    ciphertext,
    nonce,
    updatedAt: new Date(),
  };
};

export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, password, name, avatar } = req.body;

  try {
    let user = await User.findOne({ email });

    if (user) {
      res.status(400).json({ success: false, msg: "User already exists" });
      return;
    }

    user = new User({
      email,
      password,
      name,
      avatar: avatar || "",
      publicEncryptionKey: req.body.publicEncryptionKey || null,
      encryptedPrivateKeyBackup: normalizeEncryptedPrivateKeyBackup(
        req.body.encryptedPrivateKeyBackup
      ),
      settings: createDefaultUserSettings(),
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const hydratedUser = await populateUserBlocks(user);
    const token = generateToken(hydratedUser);

    res.json({
      success: true,
      token,
      user: sanitizeUser(hydratedUser),
    });
  } catch (error) {
    console.log("registerUser error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const loginUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  try {
    await purgeExpiredDeactivatedAccounts();

    const user = await User.findOne({ email });

    if (!user) {
      res.status(400).json({ success: false, msg: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(400).json({ success: false, msg: "Invalid credentials" });
      return;
    }

    if (user.accountStatus === "deactivated") {
      const isRecoverable =
        !user.scheduledDeletionAt || new Date(user.scheduledDeletionAt) > new Date();

      if (!isRecoverable) {
        await permanentlyDeleteAccountByUserId(user._id.toString());
        res.status(410).json({
          success: false,
          msg: "Account permanently deleted",
        });
        return;
      }

      user.accountStatus = "active";
      user.deactivatedAt = null;
      user.scheduledDeletionAt = null;
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      await user.save();
    }

    const resolvedSettings = getResolvedSettings(user);
    const hydratedUser = await populateUserBlocks(user);
    const token = generateToken(hydratedUser);

    if (
      hydratedUser.fcmToken &&
      hydratedUser.notificationsEnabled !== false &&
      resolvedSettings.account.securityNotifications.loginAlerts
    ) {
      await sendPushNotification({
        fcmToken: hydratedUser.fcmToken,
        userId: hydratedUser._id.toString(),
        title: "Msgly sign-in detected",
        body: "Your account was just signed in on a device.",
        data: {
          type: "login_alert",
          signedInAt: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      token,
      user: sanitizeUser(hydratedUser),
    });
  } catch (error) {
    console.log("loginUser error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const getPrivacySettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const user = await User.findById(userId).select("privateProfile showOnlineStatus settings").lean();
    const settings = getResolvedSettings(user);

    res.json({
      success: true,
      data: {
        ...settings.privacy,
      },
    });
  } catch (error) {
    console.log("getPrivacySettings error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const updatePrivacySettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const incomingPrivacy = typeof req.body === "object" && req.body !== null ? req.body : {};

  try {
    const userId = req.userId as string;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, msg: "User not found" });
      return;
    }

    const nextSettings = mergeUserSettings(getResolvedSettings(user), {
      privacy: incomingPrivacy,
    });

    user.settings = nextSettings;
    user.privateProfile = nextSettings.privacy.privateProfile;
    user.showOnlineStatus = nextSettings.privacy.showOnlineStatus;
    await user.save();

    const hydratedUser = await populateUserBlocks(user);
    const token = generateToken(hydratedUser);

    res.json({
      success: true,
      data: {
        ...nextSettings.privacy,
        token,
      },
    });
  } catch (error) {
    console.log("updatePrivacySettings error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const getUserSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const user = await User.findById(userId)
      .select("email language notificationsEnabled mutedConversations privateProfile showOnlineStatus settings")
      .lean();

    if (!user) {
      res.status(404).json({ success: false, msg: "User not found" });
      return;
    }

    res.json({
      success: true,
      data: buildSettingsResponse(user),
    });
  } catch (error) {
    console.log("getUserSettings error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const updateUserSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, msg: "User not found" });
      return;
    }

    if (
      req.body?.language === "en" ||
      req.body?.language === "hi" ||
      req.body?.language === "es"
    ) {
      user.language = req.body.language;
    }

    if (typeof req.body?.notificationsEnabled === "boolean") {
      user.notificationsEnabled = req.body.notificationsEnabled;
    }

    if (Array.isArray(req.body?.mutedConversationIds)) {
      (user as any).mutedConversations = req.body.mutedConversationIds;
    }

    const nextSettings = mergeUserSettings(
      getResolvedSettings(user),
      req.body?.settings || {}
    );

    user.settings = nextSettings;
    user.privateProfile = nextSettings.privacy.privateProfile;
    user.showOnlineStatus = nextSettings.privacy.showOnlineStatus;
    await user.save();

    const hydratedUser = await populateUserBlocks(user);
    const token = generateToken(hydratedUser);

    res.json({
      success: true,
      data: {
        ...buildSettingsResponse(hydratedUser),
        token,
      },
    });
  } catch (error) {
    console.log("updateUserSettings error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const changeEmail = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const currentPassword = String(req.body?.currentPassword || "");
  const newEmail = normalizeEmail(req.body?.newEmail);

  try {
    const userId = req.userId as string;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, msg: "User not found" });
      return;
    }

    if (!newEmail || !newEmail.includes("@")) {
      res.status(400).json({ success: false, msg: "A valid email address is required" });
      return;
    }

    if (newEmail === user.email) {
      res.status(400).json({ success: false, msg: "That email address is already in use by this account" });
      return;
    }

    const emailExists = await User.findOne({ email: newEmail }).select("_id").lean();
    if (emailExists) {
      res.status(400).json({ success: false, msg: "That email address is already taken" });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ success: false, msg: "Current password is incorrect" });
      return;
    }

    user.email = newEmail;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    const hydratedUser = await populateUserBlocks(user);
    const token = generateToken(hydratedUser);
    const settings = getResolvedSettings(hydratedUser);

    if (
      user.fcmToken &&
      user.notificationsEnabled !== false &&
      settings.account.securityNotifications.emailChangeAlerts
    ) {
      await sendPushNotification({
        fcmToken: user.fcmToken,
        userId,
        title: "Msgly email updated",
        body: `Your account email was changed to ${newEmail}.`,
        data: {
          type: "email_changed",
          changedAt: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      msg: "Email address updated successfully",
      data: {
        email: user.email,
        token,
      },
    });
  } catch (error) {
    console.log("changeEmail error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const updateTwoStepVerification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const enabled = typeof req.body?.enabled === "boolean" ? req.body.enabled : undefined;
  const pin = String(req.body?.pin || "").trim();
  const hint = String(req.body?.hint || "").trim();
  const currentPassword = String(req.body?.currentPassword || "");
  const emailRecovery = typeof req.body?.emailRecovery === "boolean" ? req.body.emailRecovery : undefined;

  try {
    const userId = req.userId as string;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, msg: "User not found" });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ success: false, msg: "Current password is incorrect" });
      return;
    }

    const currentSettings = getResolvedSettings(user);
    const nextTwoStep = {
      ...currentSettings.account.twoStepVerification,
      ...(typeof enabled === "boolean" ? { enabled } : {}),
      ...(typeof emailRecovery === "boolean" ? { emailRecovery } : {}),
      ...(hint ? { hint: hint.slice(0, 80) } : {}),
    };

    if (nextTwoStep.enabled) {
      if (!pin && !user.twoStepVerificationPinHash) {
        res.status(400).json({ success: false, msg: "A 6-digit verification PIN is required" });
        return;
      }

      if (pin && !/^\d{6}$/.test(pin)) {
        res.status(400).json({ success: false, msg: "Verification PIN must be exactly 6 digits" });
        return;
      }
    }

    if (pin) {
      const salt = await bcrypt.genSalt(10);
      user.twoStepVerificationPinHash = await bcrypt.hash(pin, salt);
    } else if (nextTwoStep.enabled === false) {
      user.twoStepVerificationPinHash = null;
    }

    const nextSettings = mergeUserSettings(currentSettings, {
      account: {
        twoStepVerification: nextTwoStep,
      },
    });

    user.settings = nextSettings;
    await user.save();

    res.json({
      success: true,
      msg: nextTwoStep.enabled
        ? "Two-step verification updated successfully"
        : "Two-step verification disabled successfully",
      data: {
        settings: nextSettings,
      },
    });
  } catch (error) {
    console.log("updateTwoStepVerification error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  try {
    const userId = req.userId as string;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, msg: "User not found" });
      return;
    }

    if (!newPassword || String(newPassword).trim().length < 6) {
      res.status(400).json({ success: false, msg: "New password must be at least 6 characters" });
      return;
    }

    if (currentPassword === newPassword) {
      res.status(400).json({ success: false, msg: "New password must be different from current password" });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      res.status(400).json({ success: false, msg: "Current password is incorrect" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    const hydratedUser = await populateUserBlocks(user);
    const token = generateToken(hydratedUser);

    const settings = getResolvedSettings(hydratedUser);

    if (
      user.fcmToken &&
      user.notificationsEnabled !== false &&
      settings.account.securityNotifications.suspiciousActivityAlerts
    ) {
      await sendPushNotification({
        fcmToken: user.fcmToken,
        userId: userId,
        title: "Msgly password changed",
        body: "Your password has been successfully changed.",
        data: {
          type: "password_changed",
          changedAt: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      msg: "Password updated successfully",
      token,
    });
  } catch (error) {
    console.log("changePassword error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const upsertEncryptionKey = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const publicEncryptionKey = String(req.body?.publicEncryptionKey || "").trim();
  const encryptedPrivateKeyBackup = normalizeEncryptedPrivateKeyBackup(
    req.body?.encryptedPrivateKeyBackup
  );

  if (!publicEncryptionKey) {
    res.status(400).json({ success: false, msg: "Public encryption key is required" });
    return;
  }

  try {
    const userId = req.userId as string;
    const user = await User.findByIdAndUpdate(
      userId,
      {
        publicEncryptionKey,
        publicEncryptionKeyUpdatedAt: new Date(),
        ...(encryptedPrivateKeyBackup ? { encryptedPrivateKeyBackup } : {}),
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .select("publicEncryptionKey publicEncryptionKeyUpdatedAt encryptedPrivateKeyBackup")
      .lean();

    if (!user) {
      res.status(404).json({ success: false, msg: "User not found" });
      return;
    }

    res.json({
      success: true,
      data: {
        publicEncryptionKey: user.publicEncryptionKey,
        publicEncryptionKeyUpdatedAt: user.publicEncryptionKeyUpdatedAt,
        encryptedPrivateKeyBackup:
          user.encryptedPrivateKeyBackup?.ciphertext && user.encryptedPrivateKeyBackup?.nonce
            ? {
                ciphertext: user.encryptedPrivateKeyBackup.ciphertext,
                nonce: user.encryptedPrivateKeyBackup.nonce,
                updatedAt: user.encryptedPrivateKeyBackup.updatedAt ?? null,
              }
            : null,
      },
    });
  } catch (error) {
    console.log("upsertEncryptionKey error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const exportMyData = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  console.log("Received request to export user data.");
  try {
    const userId = req.userId as string;
    const user = await User.findById(userId, { password: 0 }).lean();

    console.log(`Initiating data export for user ${userId} (${user?.email}).`);

    if (!user) {
      res.status(404).json({ success: false, msg: "User not found" });
      return;
    }

    const conversations = await Conversation.find({ participants: userId })
      .populate({ path: "participants", select: "name email avatar" })
      .lean();
    const messages = await Message.find({
      $or: [{ senderId: userId }, { conversationId: { $in: conversations.map((c: any) => c._id) } }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      user,
      conversations,
      messages,
    };

    console.log(`Data export prepared for user ${userId}. Conversations: ${conversations.length}, Messages: ${messages.length}`);

    let emailSent = false;
    try {
      await sendJsonExportMail({
        to: user.email,
        subject: "Your Msgly data export is ready",
        text: "Your Msgly account data export is attached to this email as a JSON file.",
        filename: `msgly-data-export-${userId}.json`,
        payload: exportPayload,
      });
      emailSent = true;
    } catch (mailError) {
      console.log("Email send failed:", mailError);
    }

    if (user.fcmToken && user.notificationsEnabled !== false) {
      await sendPushNotification({
        fcmToken: user.fcmToken,
        userId: userId,
        title: "Msgly data export ready",
        body: emailSent 
          ? "Your data export was emailed successfully. Check your inbox."
          : "Your data export is ready. Email service is not configured, but data was prepared.",
        data: {
          type: "data_export_ready",
          exportedAt: exportPayload.exportedAt,
          emailSent,
        },
      });
    }

    res.json({
      success: true,
      msg: emailSent 
        ? "Data export has been emailed successfully"
        : "Data export prepared successfully (email not sent)",
      data: {
        email: user.email,
        exportedAt: exportPayload.exportedAt,
        emailSent,
      },
    });
  } catch (error) {
    console.log("exportMyData error: ", error);
    res.status(500).json({
      success: false,
      msg:
        error instanceof Error && error.message === "Email service is not configured"
          ? "Email service is not configured"
          : "Server error",
    });
  }
};

export const deleteMyAccount = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ success: false, msg: "User not found" });
      return;
    }

    const scheduledDeletionAt = getScheduledDeletionDate();
    const graceDays = getAccountDeletionGraceDays();

    user.accountStatus = "deactivated";
    user.deactivatedAt = new Date();
    user.scheduledDeletionAt = scheduledDeletionAt;
    user.isOnline = false;
    user.lastSeen = new Date();
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    // Send push notification for account deactivation
    if (user.fcmToken && user.notificationsEnabled !== false) {
      await sendPushNotification({
        fcmToken: user.fcmToken,
        userId: userId,
        title: "Msgly account deactivated",
        body: `Your account has been deactivated. It will be permanently deleted on ${scheduledDeletionAt.toDateString()}.`,
        data: {
          type: "account_deactivated",
          deactivatedAt: new Date().toISOString(),
          scheduledDeletionAt: scheduledDeletionAt.toISOString(),
        },
      });
    }

    res.json({
      success: true,
      msg: "Account deactivated successfully",
      data: {
        scheduledDeletionAt: scheduledDeletionAt.toISOString(),
        recoveryWindowDays: graceDays,
      },
    });
  } catch (error) {
    console.log("deleteMyAccount error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};


/**
 * @desc    Toggle Block/Unblock User
 * @route   POST /api/users/block/:targetUserId
 * @access  Private (Authenticated)
 */
export const toggleBlockUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  console.log("Received request to toggle block user. Params:", req.params);
  const userId = req.userId as string; 
  const { targetUserId } = req.params; 

  if (userId === targetUserId) {
    res.status(400).json({ success: false, msg: "You cannot block yourself." });
    return;
  }

  // Validate target user existence before performing database transactions
  const targetUserExists = await User.findById(targetUserId);
  if (!targetUserExists) {
    res.status(404).json({ success: false, msg: "The user you are trying to block does not exist." });
    return;
  }

  // Fetch current block state using the dedicated Block collection
  const existingBlock = await Block.findOne({ blockerId: userId as any, blockedId: targetUserId as any });
  const isAlreadyBlocked = !!existingBlock;

  const session = await mongoose.startSession();
  let transactionCommitted = false;

  try {
    session.startTransaction();

    if (isAlreadyBlocked) {
      // ==========================================
      // ACTION: UNBLOCK USER
      // ==========================================
      await Block.findOneAndDelete({ blockerId: userId as any, blockedId: targetUserId as any }, { session });
      
      // Update the settings array and the User array for 100% backward compatibility
      await User.findByIdAndUpdate(userId, {
        $pull: { blockedUsers: targetUserId }
      }, { session });

      await session.commitTransaction();
      transactionCommitted = true;
    } else {
      // ==========================================
      // ACTION: BLOCK USER
      // ==========================================
      await Block.findOneAndUpdate(
        { blockerId: userId as any, blockedId: targetUserId as any },
        { blockerId: userId as any, blockedId: targetUserId as any },
        { upsert: true, new: true, session }
      );

      await User.findByIdAndUpdate(userId, {
        $addToSet: { blockedUsers: targetUserId }
      }, { session });

      await session.commitTransaction();
      transactionCommitted = true;
    }
  } catch (txError: any) {
    // Abort transaction safely
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    
    // Check if error is due to MongoDB standalone server (no replica set support)
    const isStandaloneError = 
      txError.message?.includes("replica set") || 
      txError.codeName === "NotAReplicaSet" ||
      txError.code === 20;

    if (isStandaloneError) {
      console.warn("MongoDB Standalone detected. Executing block transaction fallback without sessions...");
      
      if (isAlreadyBlocked) {
        await Block.findOneAndDelete({ blockerId: userId as any, blockedId: targetUserId as any });
        await User.findByIdAndUpdate(userId, {
          $pull: { blockedUsers: targetUserId }
        });
      } else {
        await Block.findOneAndUpdate(
          { blockerId: userId as any, blockedId: targetUserId as any },
          { blockerId: userId as any, blockedId: targetUserId as any },
          { upsert: true, new: true }
        );
        await User.findByIdAndUpdate(userId, {
          $addToSet: { blockedUsers: targetUserId }
        });
      }
      transactionCommitted = true;
    } else {
      console.error("CRITICAL: Block transaction failed with a database error:", txError);
      res.status(500).json({ success: false, msg: "Failed to update block records due to a database exception." });
      return;
    }
  } finally {
    session.endSession();
  }

  if (transactionCommitted) {
    try {
      // 1. Keep cache coherent by invalidating cache for both users
      await invalidateUserBlockCache(userId, String(targetUserId));

      // 2. Fetch the updated user profile to build a fresh, synchronized JWT token
      const updatedUser = await User.findById(userId);
      if (!updatedUser) {
        res.status(404).json({ success: false, msg: "Authenticated user context missing." });
        return;
      }
      const hydratedUser = await populateUserBlocks(updatedUser);
      const token = generateToken(hydratedUser);

      // 3. PRODUCTION OPTIMIZATION: Real-time Socket eviction and notifications
      const io = req.app.get("io"); 
      if (io) {
        const sharedConversation = await Conversation.findOne({
          type: "direct",
          participants: { $all: [userId, targetUserId], $size: 2 }
        }).select("_id").lean();

        if (sharedConversation) {
          const roomName = sharedConversation._id.toString();

          // Force both users to leave the shared chat room bridge immediately
          const blockerSockets = io.sockets.adapter.rooms.get(`user:${userId}`);
          const targetSockets = io.sockets.adapter.rooms.get(`user:${targetUserId}`);

          if (blockerSockets) {
            blockerSockets.forEach((socketId: string) => {
              io.sockets.sockets.get(socketId)?.leave(roomName);
            });
          }
          if (targetSockets) {
            targetSockets.forEach((socketId: string) => {
              io.sockets.sockets.get(socketId)?.leave(roomName);
            });
          }

          // Broadcast structural updates so the UI can adapt dynamically
          io.to(`user:${userId}`).emit("chatBlockedStatusUpdate", { conversationId: roomName, isBlocked: !isAlreadyBlocked });
          io.to(`user:${targetUserId}`).emit("chatBlockedStatusUpdate", { conversationId: roomName, isBlocked: !isAlreadyBlocked });
        }
      }

      res.status(200).json({ 
        success: true, 
        status: isAlreadyBlocked ? "unblocked" : "blocked", 
        msg: isAlreadyBlocked ? "User has been unblocked successfully." : "User has been blocked successfully. Real-time channels dropped.",
        token
      });
      return;
    } catch (err: any) {
      console.error("CRITICAL: Error during block finalization/socket eviction:", err);
      res.status(500).json({ success: false, msg: "Error finishing block routing operation." });
      return;
    }
  }
};

