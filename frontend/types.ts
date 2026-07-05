import { Router } from "expo-router";
import { Dispatch, ReactNode, SetStateAction } from "react";
import {
  ColorSchemeName,
  StyleProp,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";

export type TypoProps = {
  size?: number;
  color?: string;
  fontWeight?: TextStyle["fontWeight"];
  children: any | null;
  style?: TextStyle;
  textProps?: TextProps;
  numberOfLines?: number;
};

export interface UserProps {
  email: string;
  name: string;
  avatar?: string | null;
  id?: string;
  bio?: string; // Added bio field
  language?: AppLanguage;
  notificationsEnabled?: boolean;
  mutedConversations?: string[];
  privateProfile?: boolean;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  lastSeen?: string | null;
  accountStatus?: "active" | "deactivated";
  deactivatedAt?: string | null;
  scheduledDeletionAt?: string | null;
  publicEncryptionKey?: string | null;
  encryptedPrivateKeyBackup?: {
    ciphertext: string;
    nonce: string;
    updatedAt?: string | null;
  } | null;
  blockedUsers?: string[]; 
  settings?: AppUserSettings;
}

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
  themePreference: ThemePreference;
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

export interface UserNotificationSettings {
  conversationTones: boolean;
  reminders: boolean;
  messages: NotificationChannelSettings;
  groups: NotificationChannelSettings;
  calls: CallNotificationSettings;
}

export interface AppUserSettings {
  account: {
    securityNotifications: SecurityNotificationSettings;
    twoStepVerification: TwoStepVerificationSettings;
  };
  privacy: PrivacySettings;
  chats: ChatSettings;
  notifications: UserNotificationSettings;
}
export interface UserDataProps {
  name: string;
  email: string;
  avatar?: any;
}

export interface InputProps extends TextInputProps {
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  inputRef?: React.RefObject<TextInput>;
  //   label?: string;
  //   error?: string;
}

export interface DecodedTokenProps {
  user: UserProps;
  exp: number;
  iat: number;
}

export type AuthContextProps = {
  token: string | null;
  user: UserProps | null;
  appReady: boolean;
  preloadedConversations: ConversationProps[];
  setPreloadedConversations: Dispatch<SetStateAction<ConversationProps[]>>;
  preloadConversations: (manualToken?: string | null) => Promise<ConversationProps[]>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    name: string,
    avatar?: string
  ) => Promise<void>;
  logOut: (onBeforeLogout?: () => Promise<void> | void) => Promise<void>;
  updateToken: (token: string) => Promise<void>;
};

export type ScreenWrapperProps = {
  style?: ViewStyle;
  children: React.ReactNode;
  isModal?: boolean;
  showPattern?: boolean;
  bgOpacity?: number;
};

export type ResponseProps = {
  success: boolean;
  data?: any;
  msg?: string;
};

export interface ButtonProps extends TouchableOpacityProps {
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  loading?: boolean;
  children: React.ReactNode;
}

export type CustomAlertButton = {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: "default" | "cancel" | "destructive";
};

export type CustomAlertOptions = {
  title: string;
  message?: string;
  variant?: "info" | "success" | "warning" | "danger";
  buttons?: CustomAlertButton[];
  dismissible?: boolean;
};

export type CustomAlertContextProps = {
  showAlert: (options: CustomAlertOptions) => void;
  hideAlert: () => void;
};

export type ForegroundNotificationPayload = {
  id?: string;
  title: string;
  body?: string;
  avatarUrl?: string | null;
  tag?: string;
  data?: Record<string, string>;
};

export type BackButtonProps = {
  style?: ViewStyle;
  color?: string;
  iconSize?: number;
};

export type AvatarProps = {
  size?: number;
  uri: string | null;
  style?: ViewStyle;
  isGroup?: boolean;
  rounded?: number;
};

export type HeaderProps = {
  title?: string;
  style?: ViewStyle;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export type ConversationListItemProps = {
  item: ConversationProps;
  showDivider: boolean;
  isGroup?: boolean;
  router: Router;
};

export type ConversationProps = {
  _id: string;
  type: "direct" | "group";
  avatar: string | null;
  participants: {
    _id: string;
    name: string;
    avatar: string;
    email: string;
    privateProfile?: boolean;
    isOnline?: boolean;
    lastSeen?: string | null;
    publicEncryptionKey?: string | null;
  }[];
  name?: string;
  lastMessage?: {
    id: string;
    _id?: string;
    clientId?: string;
    conversationId?: string;
    sender: {
      id: string;
      name: string;
      avatar: string | null;
    };
    content: string;
    attachment?: string | null;
    createdAt: string;
    editedAt?: string | null;
    isDeleted?: boolean;
    syncStatus?: "sent" | "sending" | "pending" | "failed";
    encrypted?: boolean;
    encryption?: {
      scheme?: string | null;
      version?: number | null;
    } | null;
    encryptedPayloads?: Record<
      string,
      {
        encryptedMessage: string;
        encryptedAESKey: string;
        iv: string;
        senderPublicKey: string;
      }
    >;
  };
  createdAt: string;
  updatedAt: string;
  isMuted?: boolean;
  typingUserId?: string | null;
  unreadCount?: number;
};

export type MessageProps = {
  id: string;
  _id?: string;
  clientId?: string;
  conversationId?: string;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  };
  content: string;
  attachment?: string | null;
  isMe?: boolean;
  createdAt: string;
  editedAt?: string | null;
  isDeleted?: boolean;
  syncStatus?: "sent" | "sending" | "pending" | "failed";
  localAttachmentUri?: string | null;
  deliveredTo?: string[];
  seenBy?: string[];
  firstSeenAt?: string | null;
  disappearAfterMs?: number | null;
  disappearAt?: string | null;
  encrypted?: boolean;
  encryption?: {
    scheme?: string | null;
    version?: number | null;
  } | null;
  encryptedPayloads?: Record<
    string,
    {
      encryptedMessage: string;
      encryptedAESKey: string;
      iv: string;
      senderPublicKey: string;
    }
  >;
  decryptionFailed?: boolean;
  replyTo?: {
    id: string;
    content?: string;
    attachment?: string | null;
    sender?: {
      id?: string;
      name?: string;
    };
    isDeleted?: boolean;
  } | null;
};

export type ProfileResponse = {
  isPrivate: boolean;
  message?: string;
  user?: UserProps;
};

export type ThemeColors = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  text: string;
  white: string;
  black: string;
  rose: string;
  otherBubble: string;
  myBubble: string;
  green: string;
  neutral50: string;
  neutral100: string;
  neutral200: string;
  neutral300: string;
  neutral350: string;
  neutral400: string;
  neutral500: string;
  neutral600: string;
  neutral700: string;
  neutral800: string;
  neutral900: string;
};

export type ThemePreference = "system" | "light" | "dark";

export type ThemeContextProps = {
  colors: ThemeColors;
  colorScheme: ColorSchemeName;
  isDark: boolean;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  toggleDarkMode: (enabled: boolean) => Promise<void>;
};

export type AppLanguage = "en" | "hi" | "es";

export type AppSettingsContextProps = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  mutedConversationIds: string[];
  toggleConversationMute: (conversationId: string) => Promise<void>;
  isConversationMuted: (conversationId?: string | null) => boolean;
  emailAddress: string;
  settings: AppUserSettings;
  updateSettings: (patch: Partial<AppUserSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  t: (key: string) => string;
  isReady: boolean;
  resetSettings: () => Promise<void>;
};
