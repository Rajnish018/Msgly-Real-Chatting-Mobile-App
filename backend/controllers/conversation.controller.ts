import type { Response } from "express";
import type { Server as SocketIOServer } from "socket.io";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const getClearCutoff = (conversation: any, userId: string) => {
  const entry = (conversation?.clearedBy || []).find(
    (item: any) => item.userId?.toString?.() === userId
  );

  return entry?.clearedAt ? new Date(entry.clearedAt) : null;
};

export const getUserProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const viewerId = req.userId as string;
    const targetUserId = req.params.userId;

    const targetUser = await User.findById(targetUserId)
      .select("name email avatar bio privateProfile showOnlineStatus isOnline lastSeen publicEncryptionKey")
      .lean();

    if (!targetUser) {
      res.status(404).json({ success: false, msg: "User not found" });
      return;
    }

    const isSelf = viewerId === targetUserId;

    const hasAccess = isSelf
      || !targetUser.privateProfile
      || Boolean(
        await Conversation.exists({
          participants: { $all: [viewerId, targetUserId] },
        })
      );

    if (!hasAccess) {
      res.json({
        success: true,
        data: {
          isPrivate: true,
          message: "This account is private",
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        isPrivate: false,
        user: {
          id: targetUser._id.toString(),
          name: targetUser.name,
          email: targetUser.privateProfile && !isSelf ? "" : targetUser.email,
          avatar: targetUser.avatar || "",
          bio: targetUser.bio || "",
          privateProfile: targetUser.privateProfile ?? false,
          isOnline: targetUser.showOnlineStatus ? targetUser.isOnline ?? false : false,
          lastSeen: targetUser.showOnlineStatus ? targetUser.lastSeen ?? null : null,
          publicEncryptionKey: targetUser.publicEncryptionKey ?? null,
        },
      },
    });
  } catch (error) {
    console.log("getUserProfile error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

export const clearChat = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { scope = "me" } = req.body;
  const conversationId = String(req.params.conversationId || "");

  try {
    const userId = req.userId as string;
    const io = req.app.get("io") as SocketIOServer | undefined;
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      res.status(404).json({ success: false, msg: "Conversation not found" });
      return;
    }

    if (scope === "everyone") {
      await Message.deleteMany({ conversationId });
      conversation.lastMessage = null as any;
      conversation.clearedBy = [];
      conversation.updatedAt = new Date();
      await conversation.save();

      io?.to(conversationId).emit("chatCleared", {
        success: true,
        data: {
          conversationId,
          scope: "everyone",
          clearedAt: new Date().toISOString(),
        },
      });

      res.json({
        success: true,
        data: {
          conversationId,
          scope: "everyone",
          clearedAt: new Date().toISOString(),
        },
      });
      return;
    }

    const clearedAt = new Date();
    const nextEntries = (conversation.clearedBy || []).filter(
      (item: any) => item.userId?.toString?.() !== userId
    );

    nextEntries.push({ userId: userId as any, clearedAt });
    conversation.clearedBy = nextEntries as any;
    conversation.updatedAt = clearedAt;
    await conversation.save();

    io?.to(`user:${userId}`).emit("chatCleared", {
      success: true,
      data: {
        conversationId,
        scope: "me",
        clearedAt: clearedAt.toISOString(),
      },
    });

    const clearCutoff = getClearCutoff(conversation, userId);
    const latestVisibleMessage = await Message.findOne({
      conversationId,
      ...(clearCutoff ? { createdAt: { $gt: clearCutoff } } : {}),
    })
      .sort({ createdAt: -1 })
      .select("_id")
      .lean();

    res.json({
      success: true,
      data: {
        conversationId,
        scope: "me",
        clearedAt: clearedAt.toISOString(),
        lastVisibleMessageId: latestVisibleMessage?._id?.toString?.() || null,
      },
    });
  } catch (error) {
    console.log("clearChat error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};

const urlRegex = /(https?:\/\/[^\s]+)/gi;

const getAttachmentKind = (attachment: string) => {
  const normalized = (attachment.split("?")[0] || attachment).toLowerCase();

  if (/\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i.test(normalized)) {
    return "media";
  }

  if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|rar)$/i.test(normalized)) {
    return "docs";
  }

  return "media";
};

export const getSharedContent = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId as string;
    const conversationId = String(req.params.conversationId || "");

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    }).lean();

    if (!conversation) {
      res.status(404).json({ success: false, msg: "Conversation not found" });
      return;
    }

    const clearCutoff = getClearCutoff(conversation, userId);
    const messages = await Message.find({
      conversationId,
      isDeleted: { $ne: true },
      ...(clearCutoff ? { createdAt: { $gt: clearCutoff } } : {}),
      $and: [
        { $or: [{ disappearAt: null }, { disappearAt: { $gt: new Date() } }] },
        { $or: [{ attachment: { $exists: true, $ne: "" } }, { content: urlRegex }] },
      ],
    })
      .sort({ createdAt: -1 })
      .populate({ path: "senderId", select: "name avatar" })
      .lean();

    const media: any[] = [];
    const docs: any[] = [];
    const links: any[] = [];

    messages.forEach((message: any) => {
      const sender = message.senderId || {};
      const baseItem = {
        id: message._id?.toString?.() || String(message._id),
        sender: {
          id: sender._id?.toString?.() || "",
          name: sender.name || "User",
          avatar: sender.avatar || null,
        },
        createdAt: message.createdAt,
      };

      if (message.attachment) {
        const item = {
          ...baseItem,
          url: message.attachment,
          name: message.attachment.split("/").pop()?.split("?")[0] || "Attachment",
        };

        if (getAttachmentKind(message.attachment) === "docs") {
          docs.push(item);
        } else {
          media.push(item);
        }
      }

      const matches = String(message.content || "").match(urlRegex) || [];
      matches.forEach((url: string) => {
        links.push({
          ...baseItem,
          url,
          title: url.replace(/^https?:\/\//i, ""),
        });
      });
    });

    res.json({
      success: true,
      data: {
        media,
        links,
        docs,
      },
    });
  } catch (error) {
    console.log("getSharedContent error: ", error);
    res.status(500).json({ success: false, msg: "Server error" });
  }
};
