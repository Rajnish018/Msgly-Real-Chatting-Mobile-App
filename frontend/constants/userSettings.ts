import type { AppUserSettings, ChatWallpaperSetting } from "@/types";

export const createDefaultUserSettings = (): AppUserSettings => ({
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

export const CHAT_WALLPAPER_PRESETS: Record<
  ChatWallpaperSetting,
  {
    label: string;
    backgroundColor: string;
    accentColor: string;
    bubbleTint: string;
  }
> = {
  default: {
    label: "Default",
    backgroundColor: "#F6F1E7",
    accentColor: "#D9C9AE",
    bubbleTint: "#FFF7EA",
  },
  sunset: {
    label: "Sunset",
    backgroundColor: "#FCE7D6",
    accentColor: "#F28B50",
    bubbleTint: "#FFF2E8",
  },
  forest: {
    label: "Forest",
    backgroundColor: "#E4F0E6",
    accentColor: "#4D8C57",
    bubbleTint: "#F1FAF2",
  },
  ocean: {
    label: "Ocean",
    backgroundColor: "#DFF1F8",
    accentColor: "#2887B5",
    bubbleTint: "#F1FAFE",
  },
  midnight: {
    label: "Midnight",
    backgroundColor: "#1F2432",
    accentColor: "#7AA2F7",
    bubbleTint: "#273047",
  },
  sand: {
    label: "Sand",
    backgroundColor: "#F1E6D5",
    accentColor: "#B88A4A",
    bubbleTint: "#FBF5EA",
  },
};
