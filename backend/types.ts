import { Document, Types } from "mongoose";
import type { JwtPayload } from "jsonwebtoken";

export type VisibilitySetting = "everyone" | "contacts" | "nobody";
export type StatusVisibilitySetting = "contacts" | "except" | "share";
export type DisappearingTimerSetting = "off" | "24h" | "7d" | "90d";
export type ChatFontSizeSetting = "small" | "medium" | "large";
export type ChatWallpaperSetting =
  | "default"
  | "sunset"
  | "forest"
  | "ocean"
  | "midnight"
  | "sand";
export type ToneSetting = "default" | "chime" | "reflection" | "none";
export type VibrateSetting = "off" | "default" | "short" | "long";
export type NotificationLightSetting = "none" | "white" | "red" | "blue" | "green";
export type ChatBackupFrequencySetting = "off" | "daily" | "weekly" | "monthly";
export type ChatTransferModeSetting = "device" | "cloud";
export type ChatHistoryRetentionSetting = "forever" | "1y" | "180d" | "30d";

export interface SecurityNotificationSettings {
  loginAlerts: boolean;
  newDeviceAlerts: boolean;
  suspiciousActivityAlerts: boolean;
  emailChangeAlerts: boolean;
}

export interface TwoStepVerificationSettings {
  enabled: boolean;
  hint: string;
  emailRecovery: boolean;
}

export interface PrivacySettings {
  privateProfile: boolean;
  showOnlineStatus: boolean;
  lastSeenVisibility: VisibilitySetting;
  profilePhotoVisibility: VisibilitySetting;
  aboutVisibility: VisibilitySetting;
  linksVisibility: VisibilitySetting;
  statusVisibility: StatusVisibilitySetting;
  groupAddPermission: VisibilitySetting;
  readReceipts: boolean;
  disappearingMessagesTimer: DisappearingTimerSetting;
  avatarStickers: boolean;
  liveLocationSharing: boolean;
  silenceUnknownCallers: boolean;
  blockedUserIds: string[];
  chatLock: boolean;
  protectIpInCalls: boolean;
  disableLinkPreviews: boolean;
  screenSecurity: boolean;
}

export interface ChatSettings {
  themePreference: "system" | "light" | "dark";
  wallpaperPreset: ChatWallpaperSetting;
  customWallpaperUrl?: string | null;
  enterIsSend: boolean;
  mediaVisibility: boolean;
  fontSize: ChatFontSizeSetting;
  keepArchived: boolean;
  backupFrequency: ChatBackupFrequencySetting;
  backupIncludeVideos: boolean;
  backupOverCellular: boolean;
  transferMode: ChatTransferModeSetting;
  historyRetention: ChatHistoryRetentionSetting;
}

export interface NotificationChannelSettings {
  tone: ToneSetting;
  vibrate: VibrateSetting;
  light: NotificationLightSetting;
  highPriority: boolean;
  reactionNotifications: boolean;
}

export interface CallNotificationSettings {
  ringtone: ToneSetting;
  vibrate: VibrateSetting;
}

export interface NotificationSettings {
  conversationTones: boolean;
  reminders: boolean;
  messages: NotificationChannelSettings;
  groups: NotificationChannelSettings;
  calls: CallNotificationSettings;
}

export interface UserSettingsProps {
  account: {
    securityNotifications: SecurityNotificationSettings;
    twoStepVerification: TwoStepVerificationSettings;
  };
  privacy: PrivacySettings;
  chats: ChatSettings;
  notifications: NotificationSettings;
}

export interface UserProps extends Document {
  _id: Types.ObjectId;
  id: string;
  email: string;
  bio?: string;
  password: string;
  name?: string;
  avatar?: string;
  created?: Date;
  isOnline?: boolean,
  lastSeen?: Date,
  fcmToken?: string;
  language?: "en" | "hi" | "es";
  notificationsEnabled?: boolean;
  mutedConversations?: Types.ObjectId[];
  privateProfile?: boolean;
  showOnlineStatus?: boolean;
  tokenVersion?: number;
  accountStatus?: "active" | "deactivated";
  deactivatedAt?: Date | null;
  scheduledDeletionAt?: Date | null;
  publicEncryptionKey?: string | null;
  publicEncryptionKeyVersion?: number;
  publicEncryptionKeyUpdatedAt?: Date | null;
  encryptedPrivateKeyBackup?: {
    ciphertext?: string | null;
    nonce?: string | null;
    updatedAt?: Date | null;
  } | null;
  twoStepVerificationPinHash?: string | null;
  settings?: UserSettingsProps;
  // blockedUsers?: Types.ObjectId[];
}

export interface ConversationClearEntry {
  userId: Types.ObjectId;
  clearedAt: Date;
}

export interface ConversationProps extends Document {
  _id: Types.ObjectId;
  type: "direct" | "group";
  name?: string;
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  clearedBy?: ConversationClearEntry[];
}

export type PopulatedUser = {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  avatar?: string;
  fcmToken?: string | null;
  notificationsEnabled?: boolean;
  mutedConversations?: Types.ObjectId[];
  privateProfile?: boolean;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  lastSeen?: Date | null;
  publicEncryptionKey?: string | null;
  settings?: UserSettingsProps;
};

export interface PushNotificationParams {
  fcmToken: string;
  title: string;
  body: string;
  data?: any;
  userId?: string;
}
