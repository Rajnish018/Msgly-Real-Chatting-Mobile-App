import type {
  ChatBackupFrequencySetting,
  ChatFontSizeSetting,
  ChatHistoryRetentionSetting,
  ChatTransferModeSetting,
  ChatWallpaperSetting,
  DisappearingTimerSetting,
  NotificationLightSetting,
  StatusVisibilitySetting,
  ToneSetting,
  UserSettingsProps,
  VibrateSetting,
  VisibilitySetting,
} from "../types.js";

const visibilityOptions = ["everyone", "contacts", "nobody"] as const satisfies readonly VisibilitySetting[];
const statusVisibilityOptions = ["contacts", "except", "share"] as const satisfies readonly StatusVisibilitySetting[];
const disappearingTimerOptions = ["off", "24h", "7d", "90d"] as const satisfies readonly DisappearingTimerSetting[];
const fontSizeOptions = ["small", "medium", "large"] as const satisfies readonly ChatFontSizeSetting[];
const wallpaperOptions = [
  "default",
  "sunset",
  "forest",
  "ocean",
  "midnight",
  "sand",
] as const satisfies readonly ChatWallpaperSetting[];
const toneOptions = ["default", "chime", "reflection", "none"] as const satisfies readonly ToneSetting[];
const vibrateOptions = ["off", "default", "short", "long"] as const satisfies readonly VibrateSetting[];
const lightOptions = ["none", "white", "red", "blue", "green"] as const satisfies readonly NotificationLightSetting[];
const backupFrequencyOptions = ["off", "daily", "weekly", "monthly"] as const satisfies readonly ChatBackupFrequencySetting[];
const transferModeOptions = ["device", "cloud"] as const satisfies readonly ChatTransferModeSetting[];
const historyRetentionOptions = ["forever", "1y", "180d", "30d"] as const satisfies readonly ChatHistoryRetentionSetting[];
const themePreferenceOptions = ["system", "light", "dark"] as const;

const asBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const asStringArray = (value: unknown, fallback: string[] = []) =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : fallback;

const asOption = <T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fallback: T
): T => {
  if (typeof value !== "string") return fallback;
  return allowedValues.includes(value as T) ? (value as T) : fallback;
};

export const createDefaultUserSettings = (): UserSettingsProps => ({
  account: {
    securityNotifications: {
      loginAlerts: true,
      newDeviceAlerts: true,
      suspiciousActivityAlerts: true,
      emailChangeAlerts: true,
    },
    twoStepVerification: {
      enabled: false,
      hint: "",
      emailRecovery: true,
    },
  },
  privacy: {
    privateProfile: false,
    showOnlineStatus: true,
    lastSeenVisibility: "everyone",
    profilePhotoVisibility: "everyone",
    aboutVisibility: "everyone",
    linksVisibility: "everyone",
    statusVisibility: "contacts",
    groupAddPermission: "everyone",
    readReceipts: true,
    disappearingMessagesTimer: "off",
    avatarStickers: true,
    liveLocationSharing: false,
    silenceUnknownCallers: false,
    blockedUserIds: [],
    chatLock: false,
    protectIpInCalls: false,
    disableLinkPreviews: false,
    screenSecurity: false,
  },
  chats: {
    themePreference: "system",
    wallpaperPreset: "default",
    customWallpaperUrl: null,
    enterIsSend: false,
    mediaVisibility: true,
    fontSize: "medium",
    keepArchived: true,
    backupFrequency: "weekly",
    backupIncludeVideos: true,
    backupOverCellular: false,
    transferMode: "device",
    historyRetention: "forever",
  },
  notifications: {
    conversationTones: true,
    reminders: false,
    messages: {
      tone: "default",
      vibrate: "default",
      light: "white",
      highPriority: true,
      reactionNotifications: true,
    },
    groups: {
      tone: "default",
      vibrate: "default",
      light: "white",
      highPriority: true,
      reactionNotifications: true,
    },
    calls: {
      ringtone: "default",
      vibrate: "default",
    },
  },
});

export const sanitizeUserSettings = (value: unknown): UserSettingsProps => {
  const defaults = createDefaultUserSettings();
  const candidate = typeof value === "object" && value !== null ? (value as Record<string, any>) : {};
  const account = candidate.account || {};
  const privacy = candidate.privacy || {};
  const chats = candidate.chats || {};
  const notifications = candidate.notifications || {};

  return {
    account: {
      securityNotifications: {
        loginAlerts: asBoolean(
          account.securityNotifications?.loginAlerts,
          defaults.account.securityNotifications.loginAlerts
        ),
        newDeviceAlerts: asBoolean(
          account.securityNotifications?.newDeviceAlerts,
          defaults.account.securityNotifications.newDeviceAlerts
        ),
        suspiciousActivityAlerts: asBoolean(
          account.securityNotifications?.suspiciousActivityAlerts,
          defaults.account.securityNotifications.suspiciousActivityAlerts
        ),
        emailChangeAlerts: asBoolean(
          account.securityNotifications?.emailChangeAlerts,
          defaults.account.securityNotifications.emailChangeAlerts
        ),
      },
      twoStepVerification: {
        enabled: asBoolean(
          account.twoStepVerification?.enabled,
          defaults.account.twoStepVerification.enabled
        ),
        hint: asString(account.twoStepVerification?.hint, "")
          .slice(0, 80),
        emailRecovery: asBoolean(
          account.twoStepVerification?.emailRecovery,
          defaults.account.twoStepVerification.emailRecovery
        ),
      },
    },
    privacy: {
      privateProfile: asBoolean(privacy.privateProfile, defaults.privacy.privateProfile),
      showOnlineStatus: asBoolean(privacy.showOnlineStatus, defaults.privacy.showOnlineStatus),
      lastSeenVisibility: asOption(
        privacy.lastSeenVisibility,
        visibilityOptions,
        defaults.privacy.lastSeenVisibility
      ),
      profilePhotoVisibility: asOption(
        privacy.profilePhotoVisibility,
        visibilityOptions,
        defaults.privacy.profilePhotoVisibility
      ),
      aboutVisibility: asOption(
        privacy.aboutVisibility,
        visibilityOptions,
        defaults.privacy.aboutVisibility
      ),
      linksVisibility: asOption(
        privacy.linksVisibility,
        visibilityOptions,
        defaults.privacy.linksVisibility
      ),
      statusVisibility: asOption(
        privacy.statusVisibility,
        statusVisibilityOptions,
        defaults.privacy.statusVisibility
      ),
      groupAddPermission: asOption(
        privacy.groupAddPermission,
        visibilityOptions,
        defaults.privacy.groupAddPermission
      ),
      readReceipts: asBoolean(privacy.readReceipts, defaults.privacy.readReceipts),
      disappearingMessagesTimer: asOption(
        privacy.disappearingMessagesTimer,
        disappearingTimerOptions,
        defaults.privacy.disappearingMessagesTimer
      ),
      avatarStickers: asBoolean(privacy.avatarStickers, defaults.privacy.avatarStickers),
      liveLocationSharing: asBoolean(
        privacy.liveLocationSharing,
        defaults.privacy.liveLocationSharing
      ),
      silenceUnknownCallers: asBoolean(
        privacy.silenceUnknownCallers,
        defaults.privacy.silenceUnknownCallers
      ),
      blockedUserIds: asStringArray(privacy.blockedUserIds),
      chatLock: asBoolean(privacy.chatLock, defaults.privacy.chatLock),
      protectIpInCalls: asBoolean(
        privacy.protectIpInCalls,
        defaults.privacy.protectIpInCalls
      ),
      disableLinkPreviews: asBoolean(
        privacy.disableLinkPreviews,
        defaults.privacy.disableLinkPreviews
      ),
      screenSecurity: asBoolean(privacy.screenSecurity, defaults.privacy.screenSecurity),
    },
    chats: {
      themePreference: asOption(
        chats.themePreference,
        themePreferenceOptions,
        defaults.chats.themePreference
      ),
      wallpaperPreset: asOption(
        chats.wallpaperPreset,
        wallpaperOptions,
        defaults.chats.wallpaperPreset
      ),
      customWallpaperUrl: chats.customWallpaperUrl === null
        ? null
        : asString(chats.customWallpaperUrl, "") || null,
      enterIsSend: asBoolean(chats.enterIsSend, defaults.chats.enterIsSend),
      mediaVisibility: asBoolean(chats.mediaVisibility, defaults.chats.mediaVisibility),
      fontSize: asOption(chats.fontSize, fontSizeOptions, defaults.chats.fontSize),
      keepArchived: asBoolean(chats.keepArchived, defaults.chats.keepArchived),
      backupFrequency: asOption(
        chats.backupFrequency,
        backupFrequencyOptions,
        defaults.chats.backupFrequency
      ),
      backupIncludeVideos: asBoolean(
        chats.backupIncludeVideos,
        defaults.chats.backupIncludeVideos
      ),
      backupOverCellular: asBoolean(
        chats.backupOverCellular,
        defaults.chats.backupOverCellular
      ),
      transferMode: asOption(
        chats.transferMode,
        transferModeOptions,
        defaults.chats.transferMode
      ),
      historyRetention: asOption(
        chats.historyRetention,
        historyRetentionOptions,
        defaults.chats.historyRetention
      ),
    },
    notifications: {
      conversationTones: asBoolean(
        notifications.conversationTones,
        defaults.notifications.conversationTones
      ),
      reminders: asBoolean(notifications.reminders, defaults.notifications.reminders),
      messages: {
        tone: asOption(
          notifications.messages?.tone,
          toneOptions,
          defaults.notifications.messages.tone
        ),
        vibrate: asOption(
          notifications.messages?.vibrate,
          vibrateOptions,
          defaults.notifications.messages.vibrate
        ),
        light: asOption(
          notifications.messages?.light,
          lightOptions,
          defaults.notifications.messages.light
        ),
        highPriority: asBoolean(
          notifications.messages?.highPriority,
          defaults.notifications.messages.highPriority
        ),
        reactionNotifications: asBoolean(
          notifications.messages?.reactionNotifications,
          defaults.notifications.messages.reactionNotifications
        ),
      },
      groups: {
        tone: asOption(
          notifications.groups?.tone,
          toneOptions,
          defaults.notifications.groups.tone
        ),
        vibrate: asOption(
          notifications.groups?.vibrate,
          vibrateOptions,
          defaults.notifications.groups.vibrate
        ),
        light: asOption(
          notifications.groups?.light,
          lightOptions,
          defaults.notifications.groups.light
        ),
        highPriority: asBoolean(
          notifications.groups?.highPriority,
          defaults.notifications.groups.highPriority
        ),
        reactionNotifications: asBoolean(
          notifications.groups?.reactionNotifications,
          defaults.notifications.groups.reactionNotifications
        ),
      },
      calls: {
        ringtone: asOption(
          notifications.calls?.ringtone,
          toneOptions,
          defaults.notifications.calls.ringtone
        ),
        vibrate: asOption(
          notifications.calls?.vibrate,
          vibrateOptions,
          defaults.notifications.calls.vibrate
        ),
      },
    },
  };
};

export const mergeUserSettings = (
  currentSettings: UserSettingsProps,
  incomingSettings: unknown
): UserSettingsProps => {
  const nextCandidate =
    typeof incomingSettings === "object" && incomingSettings !== null
      ? (incomingSettings as Record<string, any>)
      : {};

  return sanitizeUserSettings({
    ...currentSettings,
    ...nextCandidate,
    account: {
      ...currentSettings.account,
      ...(nextCandidate.account || {}),
      securityNotifications: {
        ...currentSettings.account.securityNotifications,
        ...(nextCandidate.account?.securityNotifications || {}),
      },
      twoStepVerification: {
        ...currentSettings.account.twoStepVerification,
        ...(nextCandidate.account?.twoStepVerification || {}),
      },
    },
    privacy: {
      ...currentSettings.privacy,
      ...(nextCandidate.privacy || {}),
    },
    chats: {
      ...currentSettings.chats,
      ...(nextCandidate.chats || {}),
    },
    notifications: {
      ...currentSettings.notifications,
      ...(nextCandidate.notifications || {}),
      messages: {
        ...currentSettings.notifications.messages,
        ...(nextCandidate.notifications?.messages || {}),
      },
      groups: {
        ...currentSettings.notifications.groups,
        ...(nextCandidate.notifications?.groups || {}),
      },
      calls: {
        ...currentSettings.notifications.calls,
        ...(nextCandidate.notifications?.calls || {}),
      },
    },
  });
};
