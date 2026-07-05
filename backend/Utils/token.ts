import type { UserProps } from "../types.js";
import jwt from "jsonwebtoken";

export const generateToken = (user: any) => {
  const userId = user.id || user._id?.toString();
  const payload = {
    user: {
      id: userId,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      privateProfile: user.privateProfile,
      showOnlineStatus: user.showOnlineStatus,
      notificationsEnabled: user.notificationsEnabled,
      tokenVersion: user.tokenVersion ?? 0,
      accountStatus: user.accountStatus ?? "active",
      deactivatedAt: user.deactivatedAt ?? null,
      scheduledDeletionAt: user.scheduledDeletionAt ?? null,
      publicEncryptionKey: user.publicEncryptionKey ?? null,
      settings: user.settings ?? null,
      blockedUsers: user.settings?.privacy?.blockedUserIds ?? [],
    },
  };

  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "30d",
  });
};

// "30d" for 30 days
// "1m" for 1 month
// "1y" for 1 year
// "24h" for 24 hours
// "60s" for 60 seconds
