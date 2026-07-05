import { Server as SocketIOServer, Socket } from "socket.io";
import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";
import { generateToken } from "../Utils/token.js";

const sanitizeContact = (user: any, viewerId: string) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.privateProfile && user._id.toString() !== viewerId ? "" : user.email,
  avatar: user.avatar || "",
  bio: user.bio || "",
  isOnline: user.showOnlineStatus ? user.isOnline || false : false,
  lastSeen: user.showOnlineStatus ? user.lastSeen || null : null,
  privateProfile: user.privateProfile || false,
  showOnlineStatus: user.showOnlineStatus ?? true,
  publicEncryptionKey: user.publicEncryptionKey ?? null,
});

const buildProfileUpdate = (
  existingUser: any,
  incoming: { name?: string; avatar?: string; bio?: string }
) => {
  const nextValues = {
    name:
      typeof incoming.name === "string" ? incoming.name.trim() : existingUser.name,
    avatar:
      typeof incoming.avatar === "string" ? incoming.avatar.trim() : existingUser.avatar || "",
    bio:
      typeof incoming.bio === "string" ? incoming.bio.trim() : existingUser.bio || "",
  };

  const changedFields: Record<string, string> = {};

  if (nextValues.name !== existingUser.name) {
    changedFields.name = nextValues.name;
  }

  if (nextValues.avatar !== (existingUser.avatar || "")) {
    changedFields.avatar = nextValues.avatar;
  }

  if (nextValues.bio !== (existingUser.bio || "")) {
    changedFields.bio = nextValues.bio;
  }

  return { nextValues, changedFields };
};

const emitPresenceUpdate = async (
  io: SocketIOServer,
  userId: string,
  payload: {
    userId: string;
    isOnline: boolean;
    lastSeen: Date | null;
    showOnlineStatus: boolean;
  }
) => {
  const conversations = await Conversation.find({
    participants: userId,
  })
    .select("participants")
    .lean();

  const audience = new Set<string>();

  conversations.forEach((conversation: any) => {
    (conversation.participants || []).forEach((participantId: any) => {
      const nextId = participantId.toString();
      if (nextId !== userId) {
        audience.add(nextId);
      }
    });
  });

  audience.forEach((participantId) => {
    io.to(`user:${participantId}`).emit("presenceUpdated", payload);
  });
};

export function registerUserEvents(io: SocketIOServer, socket: Socket) {
  socket.on("testSocket", (data) => {
    socket.emit("testSocket", {
      success: true,
      msg: "its working!!",
      data,
    });
  });

  socket.on(
    "updateProfile",
    async (data: { name?: string; avatar?: string; bio?: string }) => {
      const userId = socket.data.userId;

      if (!userId) {
        socket.emit("updateProfileResponse", {
          success: false,
          msg: "Unauthorized",
        });
        return;
      }

      try {
        const existingUser = await User.findById(userId);

        if (!existingUser) {
          socket.emit("updateProfileResponse", {
            success: false,
            msg: "User not found",
          });
          return;
        }

        const { changedFields } = buildProfileUpdate(existingUser, data);

        if (!Object.keys(changedFields).length) {
          socket.emit("updateProfileResponse", {
            success: true,
            changed: false,
            data: {
              token: generateToken(existingUser),
              user: sanitizeContact(existingUser.toObject(), userId),
            },
            msg: "No profile changes detected",
          });
          return;
        }

        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $set: changedFields },
          { new: true, runValidators: true }
        );

        if (!updatedUser) {
          socket.emit("updateProfileResponse", {
            success: false,
            msg: "User not found",
          });
          return;
        }

        const newToken = generateToken(updatedUser);

        socket.data = {
          ...socket.data,
          name: updatedUser.name,
          email: updatedUser.email,
          avatar: updatedUser.avatar,
          bio: updatedUser.bio,
        };

        socket.emit("updateProfileResponse", {
          success: true,
          changed: true,
          data: {
            token: newToken,
            user: sanitizeContact(updatedUser.toObject(), userId),
          },
          msg: "Profile updated successfully",
        });
      } catch (error: any) {
        console.error("Error updating profile:", error);
        socket.emit("updateProfileResponse", {
          success: false,
          msg: error?.message || "Error updating profile",
        });
      }
    }
  );

  socket.on("getContacts", async () => {
    try {
      const currentUserId = socket.data.userId;

      if (!currentUserId) {
        socket.emit("getContacts", {
          success: false,
          msg: "Unauthorized (userId missing)",
        });
        return;
      }

      const users = await User.find(
        { _id: { $ne: currentUserId } },
        { password: 0 }
      ).lean();

      socket.emit("getContacts", {
        success: true,
        data: users.map((user: any) => sanitizeContact(user, currentUserId)),
      });
    } catch (error: any) {
      console.log("getContacts error:", error);
      socket.emit("getContacts", {
        success: false,
        msg: "Failed to fetch contacts",
      });
    }
  });

  socket.on("updatePushToken", async (data) => {
    try {
      const userId = socket.data.userId;
      const rawToken = data?.fcmToken;
      const fcmToken =
        typeof rawToken === "string" && rawToken.trim().length > 0
          ? rawToken.trim()
          : null;

      await User.findByIdAndUpdate(userId, { fcmToken });
      socket.emit("updatePushToken", { success: true, msg: "Token saved" });
    } catch (err) {
      console.log("updatePushToken error:", err);
      socket.emit("updatePushToken", { success: false, msg: "Server error" });
    }
  });

  socket.on("getPreferences", async () => {
    try {
      const userId = socket.data.userId;

      const user = await User.findById(userId)
        .select("language notificationsEnabled mutedConversations privateProfile showOnlineStatus")
        .lean();

      socket.emit("getPreferences", {
        success: true,
        data: {
          language: user?.language || "en",
          notificationsEnabled: user?.notificationsEnabled ?? true,
          mutedConversationIds: (user?.mutedConversations || []).map((id: any) =>
            id.toString()
          ),
          privateProfile: user?.privateProfile ?? false,
          showOnlineStatus: user?.showOnlineStatus ?? true,
        },
      });
    } catch (error) {
      console.log("getPreferences error:", error);
      socket.emit("getPreferences", {
        success: false,
        msg: "Failed to fetch preferences",
      });
    }
  });

  socket.on("updatePreferences", async (data) => {
    try {
      const userId = socket.data.userId;
      const updateData: any = {};

      if (typeof data?.language === "string") {
        updateData.language = data.language;
      }

      if (typeof data?.notificationsEnabled === "boolean") {
        updateData.notificationsEnabled = data.notificationsEnabled;
      }

      if (Array.isArray(data?.mutedConversationIds)) {
        updateData.mutedConversations = data.mutedConversationIds;
      }

      if (typeof data?.privateProfile === "boolean") {
        updateData.privateProfile = data.privateProfile;
      }

      if (typeof data?.showOnlineStatus === "boolean") {
        updateData.showOnlineStatus = data.showOnlineStatus;
      }

      const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      })
        .select("language notificationsEnabled mutedConversations privateProfile showOnlineStatus isOnline lastSeen")
        .lean();

      if (typeof data?.showOnlineStatus === "boolean") {
        await emitPresenceUpdate(io, userId, {
          userId,
          isOnline: data.showOnlineStatus ? user?.isOnline ?? false : false,
          lastSeen: data.showOnlineStatus ? user?.lastSeen ?? null : new Date(),
          showOnlineStatus: data.showOnlineStatus,
        });
      }

      socket.emit("updatePreferences", {
        success: true,
        data: {
          language: user?.language || "en",
          notificationsEnabled: user?.notificationsEnabled ?? true,
          mutedConversationIds: (user?.mutedConversations || []).map((id: any) =>
            id.toString()
          ),
          privateProfile: user?.privateProfile ?? false,
          showOnlineStatus: user?.showOnlineStatus ?? true,
        },
      });
    } catch (error) {
      console.log("updatePreferences error:", error);
      socket.emit("updatePreferences", {
        success: false,
        msg: "Failed to update preferences",
      });
    }
  });
}
