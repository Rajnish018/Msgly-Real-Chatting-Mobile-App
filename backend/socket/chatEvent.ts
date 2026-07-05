import type { Server as SocketIOServer, Socket } from "socket.io";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { sendPushNotification } from "../Utils/sendPush.js";
import {
  validateE2EEncryptedPayload,
  validateParticipantEncryption,
  formatE2EEncryptedMessage,
  generateEncryptionMetadata,
} from "../Utils/e2eEncryption.js";
import type { PopulatedUser } from "../types.js";
import { getBidirectionalBlacklist } from "../Utils/blockCache.js";

const EDIT_WINDOW_MS = 3 * 60 * 1000;
const DISAPPEARING_TIMER_TO_MS = {
  off: 0,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
} as const;

const areUsersBlocked = async (firstUserId: string, secondUserId: string) => {
  try {
    const blacklist = await getBidirectionalBlacklist(firstUserId);
    return blacklist.has(secondUserId);
  } catch (err) {
    console.error("Error checking areUsersBlocked via cache:", err);
    return false;
  }
};

const sanitizeParticipant = (participant: any, viewerId: string) => ({
  ...participant,
  email:
    participant?.privateProfile && participant?._id?.toString?.() !== viewerId
      ? ""
      : participant?.email,
  isOnline: participant?.showOnlineStatus ? participant?.isOnline || false : false,
  lastSeen: participant?.showOnlineStatus ? participant?.lastSeen || null : null,
  publicEncryptionKey: participant?.publicEncryptionKey || null,
});

const normalizeIdArray = (ids: any[] = []) =>
  ids.map((id) => id?.toString?.() || String(id)).filter(Boolean);

const getDisappearingDurationMs = (timer: string | null | undefined) =>
  DISAPPEARING_TIMER_TO_MS[timer as keyof typeof DISAPPEARING_TIMER_TO_MS] || 0;

const formatMessage = (message: any) => {
  const populatedSender = message?.senderId as PopulatedUser | null;
  const replySender = message?.replyTo?.senderId as PopulatedUser | null;
  const encryptedPayloads =
    message?.encryptedPayloads instanceof Map
      ? Object.fromEntries(message.encryptedPayloads.entries())
      : message?.encryptedPayloads || undefined;

  return {
    ...message,
    id: message?._id?.toString?.() || message?._id,
    conversationId:
      message?.conversationId?.toString?.() || message?.conversationId || null,
    sender: {
      id: populatedSender?._id?.toString?.() || "",
      name: populatedSender?.name,
      avatar: populatedSender?.avatar,
    },
    encrypted: Boolean(message?.encrypted),
    encryption: message?.encryption || null,
    encryptedPayloads,
    deliveredTo: normalizeIdArray(message?.deliveredTo || []),
    seenBy: normalizeIdArray(message?.seenBy || []),
    firstSeenAt: message?.firstSeenAt || null,
    disappearAfterMs: message?.disappearAfterMs ?? null,
    disappearAt: message?.disappearAt || null,
    replyTo: message?.replyTo
      ? {
          id: message.replyTo._id?.toString?.() || message.replyTo._id,
          content: message.replyTo.content,
          attachment: message.replyTo.attachment,
          isDeleted: message.replyTo.isDeleted,
          sender: {
            id: replySender?._id?.toString?.(),
            name: replySender?.name,
          },
        }
      : null,
  };
};

const isMessageExpired = (message: any) =>
  Boolean(message?.disappearAt && new Date(message.disappearAt).getTime() <= Date.now());

const getConversationClearCutoff = (conversation: any, userId: string) => {
  const clearedEntry = (conversation?.clearedBy || []).find(
    (entry: any) => entry.userId?.toString?.() === userId
  );

  return clearedEntry?.clearedAt ? new Date(clearedEntry.clearedAt) : null;
};

const populateMessageById = async (messageId: any) => {
  if (!messageId) return null;

  const message = await Message.findById(messageId)
    .populate({ path: "senderId", select: "name avatar" })
    .populate({
      path: "replyTo",
      populate: {
        path: "senderId",
        select: "name avatar",
      },
    })
    .lean();

  return message ? formatMessage(message) : null;
};

const emitFormattedMessages = async (
  io: SocketIOServer,
  conversationId: string,
  eventName: string,
  messageIds: any[]
) => {
  if (!messageIds.length) return;

  const messages = await Message.find({ _id: { $in: messageIds } })
    .populate({ path: "senderId", select: "name avatar" })
    .populate({
      path: "replyTo",
      populate: {
        path: "senderId",
        select: "name avatar",
      },
    })
    .lean();

  messages.forEach((message: any) => {
    io.to(conversationId).emit(eventName, {
      success: true,
      data: formatMessage(message),
    });
  });
};

const cleanupExpiredMessages = async (io: SocketIOServer, conversationId: string) => {
  const expiredMessages = await Message.find({
    conversationId,
    disappearAt: { $lte: new Date() },
  })
    .select("_id")
    .lean();

  if (!expiredMessages.length) return;

  const expiredIds = expiredMessages.map((message: any) => message._id.toString());

  await Message.deleteMany({
    _id: { $in: expiredIds },
  });

  io.to(conversationId).emit("messagesExpired", {
    success: true,
    data: {
      conversationId,
      messageIds: expiredIds,
    },
  });

  await emitConversationUpdate(io, conversationId);
};

const markMessagesDelivered = async (
  io: SocketIOServer,
  conversationId: string,
  userId: string
) => {
  await cleanupExpiredMessages(io, conversationId);

  const targetMessages = await Message.find({
    conversationId,
    senderId: { $ne: userId },
    deliveredTo: { $ne: userId },
    $or: [{ disappearAt: null }, { disappearAt: { $gt: new Date() } }],
  })
    .select("_id")
    .lean();

  if (!targetMessages.length) return;

  const messageIds = targetMessages.map((message: any) => message._id);

  await Message.updateMany(
    { _id: { $in: messageIds } },
    { $addToSet: { deliveredTo: userId } }
  );

  await emitFormattedMessages(io, conversationId, "messageStatusUpdated", messageIds);
};

const markMessagesSeen = async (
  io: SocketIOServer,
  conversationId: string,
  userId: string,
  messageIds?: string[]
) => {
  await cleanupExpiredMessages(io, conversationId);

  const targetMessages = await Message.find({
    conversationId,
    senderId: { $ne: userId },
    seenBy: { $ne: userId },
    ...(messageIds?.length ? { _id: { $in: messageIds } } : {}),
    $or: [{ disappearAt: null }, { disappearAt: { $gt: new Date() } }],
  }).lean();

  if (!targetMessages.length) return;

  const now = new Date();

  for (const message of targetMessages) {
    const update: Record<string, any> = {
      $addToSet: {
        deliveredTo: userId,
        seenBy: userId,
      },
    };

    const nextSet: Record<string, any> = {};

    if (!message.firstSeenAt) {
      nextSet.firstSeenAt = now;
    }

    if (message.disappearAfterMs && !message.disappearAt) {
      nextSet.disappearAt = new Date(now.getTime() + message.disappearAfterMs);
    }

    if (Object.keys(nextSet).length) {
      update.$set = nextSet;
    }

    await Message.updateOne({ _id: message._id }, update);
  }

  await emitFormattedMessages(
    io,
    conversationId,
    "messageStatusUpdated",
    targetMessages.map((message: any) => message._id)
  );

  await emitConversationUpdate(io, conversationId);
};

const getLatestVisibleMessage = async (conversationId: string, userId: string) => {
  const conversation = await Conversation.findById(conversationId)
    .select("clearedBy")
    .lean();

  const clearCutoff = getConversationClearCutoff(conversation, userId);

  const latestMessage = await Message.findOne({
    conversationId,
    ...(clearCutoff ? { createdAt: { $gt: clearCutoff } } : {}),
    $or: [{ disappearAt: null }, { disappearAt: { $gt: new Date() } }],
  })
    .sort({ createdAt: -1 })
    .populate({ path: "senderId", select: "name avatar" })
    .lean();

  return latestMessage ? formatMessage(latestMessage) : null;
};

const buildConversationPayloadForUser = async (
  conversationId: string,
  userId: string
) => {
  const conversation = await Conversation.findById(conversationId)
    .populate({
      path: "participants",
      select:
        "name avatar email fcmToken notificationsEnabled mutedConversations privateProfile showOnlineStatus isOnline lastSeen publicEncryptionKey",
    })
    .lean();

  if (!conversation) return null;

  const user = await User.findById(userId).select("mutedConversations").lean();

  const visibleLastMessage = await getLatestVisibleMessage(conversationId, userId);

  const unreadCount = await Message.countDocuments({
    conversationId,
    senderId: { $ne: userId },
    seenBy: { $ne: userId },
    isDeleted: { $ne: true },
    $or: [{ disappearAt: null }, { disappearAt: { $gt: new Date() } }],
  });

  return {
    ...conversation,
    lastMessage: visibleLastMessage,
    unreadCount,
    participants: (conversation.participants || []).map((participant: any) =>
      sanitizeParticipant(participant, userId)
    ),
    isMuted: (user?.mutedConversations || []).some(
      (id: any) => id.toString() === conversationId.toString()
    ),
  };
};

const emitConversationUpdate = async (io: SocketIOServer, conversationId: string) => {
  const conversation = await Conversation.findById(conversationId)
    .select("participants")
    .lean();

  if (!conversation) return null;

  for (const participantId of conversation.participants || []) {
    const userId = participantId.toString();
    const personalPayload = await buildConversationPayloadForUser(conversationId, userId);

    if (personalPayload) {
      io.to(`user:${userId}`).emit("conversationUpdated", {
        success: true,
        data: personalPayload,
      });
    }
  }

  return conversation;
};

const getMessagesForConversation = async (conversationId: string, userId: string) => {
  const conversation = await Conversation.findById(conversationId)
    .select("clearedBy")
    .lean();

  const clearCutoff = getConversationClearCutoff(conversation, userId);

  const messages = await Message.find({
    conversationId,
    ...(clearCutoff ? { createdAt: { $gt: clearCutoff } } : {}),
    $or: [{ disappearAt: null }, { disappearAt: { $gt: new Date() } }],
  })
    .sort({ createdAt: -1 })
    .populate({
      path: "senderId",
      select: "name avatar",
    })
    .populate({
      path: "replyTo",
      populate: {
        path: "senderId",
        select: "name avatar",
      },
    })
    .lean();

  return messages.map((message: any) => formatMessage(message));
};

export function registerChatEvents(io: SocketIOServer, socket: Socket) {
  socket.on("joinConversation", async (conversationId: string) => {
    if (!conversationId) return;
    socket.join(conversationId.toString());

    if (socket.data.userId) {
      await markMessagesDelivered(io, conversationId.toString(), socket.data.userId.toString());
    }
  });

  socket.on("getConversations", async () => {
    try {
      const userId = socket.data.userId;

      if (!userId) {
        socket.emit("getConversations", {
          success: false,
          msg: "Unauthorized",
        });
        return;
      }

      const conversations = await Conversation.find({
        participants: userId,
      })
        .sort({ updatedAt: -1 })
        .lean();

      const payload = await Promise.all(
        conversations.map((conversation: any) =>
          buildConversationPayloadForUser(conversation._id.toString(), userId)
        )
      );

      socket.emit("getConversations", {
        success: true,
        data: payload.filter(Boolean),
      });
    } catch (error: any) {
      console.log("getConversations error: ", error);
      socket.emit("getConversations", {
        success: false,
        msg: "Failed to fetch conversations",
      });
    }
  });

  socket.on("newConversation", async (data) => {
    try {
      if (data.type === "direct" && Array.isArray(data.participants) && data.participants.length === 2) {
        const [firstUserId, secondUserId] = data.participants.map((id: string) => String(id));
        const isBlocked = await areUsersBlocked(firstUserId, secondUserId);

        if (isBlocked) {
          socket.emit("newConversation", {
            success: false,
            msg: "This conversation is unavailable because one of the users has blocked the other.",
          });
          return;
        }
      }

      if (data.type === "direct") {
        const existingConversation = await Conversation.findOne({
          type: "direct",
          participants: { $all: data.participants, $size: 2 },
        }).lean();

        if (existingConversation) {
          const responsePayload = await buildConversationPayloadForUser(
            existingConversation._id.toString(),
            socket.data.userId
          );

          socket.emit("newConversation", {
            success: true,
            data: {
              ...responsePayload,
              isNew: false,
            },
          });
          return;
        }
      }

      const newConversation = await Conversation.create({
        type: data.type,
        participants: data.participants,
        name: data.name,
        avatar: data.avatar,
        createdBy: socket.data.userId,
      });

      data.participants.forEach((participantId: string) => {
        io.to(`user:${participantId}`).socketsJoin(newConversation._id.toString());
      });

      for (const participantId of data.participants || []) {
        const payload = await buildConversationPayloadForUser(
          newConversation._id.toString(),
          participantId
        );

        if (payload) {
          io.to(`user:${participantId}`).emit("newConversation", {
            success: true,
            data: {
              ...payload,
              isNew: true,
            },
          });
        }
      }
    } catch (error: any) {
      console.log("newConversation error:", error);
      socket.emit("newConversation", {
        success: false,
        msg: "Failed to create conversation",
      });
    }
  });


socket.on("newMessage", async (data) => {
  // Safe extraction of client side local ID tracking payload
  const clientTrackingId = typeof data?.clientId === "string" ? data.clientId : undefined;

  try {
    const senderId = socket.data.userId?.toString();
    let activeConversationId = data.conversationId;

    if (!senderId) {
      return socket.emit("newMessage", { success: false, data: { clientId: clientTrackingId }, msg: "Unauthorized" });
    }

    // 1. DYNAMIC DIRECT CHAT INITIALIZATION (NO CONVERSATION ID PASSED)
    if (!activeConversationId && Array.isArray(data.participants) && data.participants.length >= 2) {
      const [firstUserId, secondUserId] = data.participants.map((id: string) => String(id));
      
      // Enforce early validation check
      const isBlocked = await areUsersBlocked(firstUserId, secondUserId);
      if (isBlocked) {
        return socket.emit("newMessage", {
          success: false,
          data: { clientId: clientTrackingId },
          msg: "Message not delivered. You cannot message a user who has blocked you (or whom you have blocked)."
        });
      }

      const existingConversation = await Conversation.findOne({
        type: "direct",
        participants: { $all: data.participants, $size: 2 },
      }).lean();

      if (existingConversation) {
        activeConversationId = existingConversation._id.toString();
      } else {
        const createdConversation = await Conversation.create({
          type: "direct",
          participants: data.participants,
          createdBy: senderId,
        });
        activeConversationId = createdConversation._id.toString();

        // Bind all participants to the new real-time room bridge channel
        data.participants.forEach((participantId: string) => {
          io.to(`user:${participantId}`).socketsJoin(activeConversationId.toString());
        });
      }
    }

    if (!activeConversationId) {
      return socket.emit("newMessage", { success: false, data: { clientId: clientTrackingId }, msg: "Conversation not found" });
    }

    // 2. FETCH AND VERIFY CHAT ROOM MEMBERSHIPS
    const activeConversation = await Conversation.findById(activeConversationId)
      .select("type participants")
      .lean();

    if (!activeConversation) {
      return socket.emit("newMessage", { success: false, data: { clientId: clientTrackingId }, msg: "Conversation context missing" });
    }

    // Run custom automated lifecycle data logic checks
    await cleanupExpiredMessages(io, activeConversationId.toString());

    // 3. EXISTENT DIRECT CHAT ROOM BLOCK VERIFICATION
    if (
      activeConversation.type === "direct" &&
      Array.isArray(activeConversation.participants) &&
      activeConversation.participants.length === 2
    ) {
      const [firstUserId, secondUserId] = activeConversation.participants.map((id: any) => id.toString());
      
      const isBlocked = await areUsersBlocked(firstUserId, secondUserId);
      if (isBlocked) {
        return socket.emit("newMessage", {
          success: false,
          data: { clientId: clientTrackingId },
          msg: "Message not delivered. You cannot message a user who has blocked you (or whom you have blocked)."
        });
      }
    }

    // 4. CHAT COMPOSER REPLY EVALUATION
    let replyToMessageId: string | null = null;
    if (data.replyTo) {
      const replyTarget = await Message.findById(data.replyTo)
        .select("_id conversationId isDeleted disappearAt")
        .lean();

      if (
        replyTarget &&
        !replyTarget.isDeleted &&
        !isMessageExpired(replyTarget) &&
        replyTarget.conversationId?.toString() === activeConversationId.toString()
      ) {
        replyToMessageId = replyTarget._id.toString();
      }
    }

    // 5. EVALUATE DISAPPEARING TIMER SETTINGS
    const senderUser = await User.findById(senderId)
      .select("settings.privacy.disappearingMessagesTimer")
      .lean();

    const disappearAfterMs = getDisappearingDurationMs(
      senderUser?.settings?.privacy?.disappearingMessagesTimer
    );

    const participantIds = (activeConversation.participants || []).map((id: any) => id.toString());

    // Construct an online tracker index map to parse dynamic delivery flags
    const onlineUserIds = new Set(
      Array.from(io.sockets.sockets.values())
        .map((s) => s.data.userId?.toString())
        .filter(Boolean)
    );

    const deliveredTo = participantIds.filter(
      (participantId: string) => participantId === senderId || onlineUserIds.has(participantId)
    );

    // Pull sender out of cleared arrays if they cleared history previously
    await Conversation.findByIdAndUpdate(activeConversationId, {
      $pull: { clearedBy: { userId: senderId } },
    });

    // VALIDATE E2E ENCRYPTION IF PRESENT
    let encryptionMetadata = null;
    let validatedEncryptedPayloads = null;

    if (data.encryptedPayloads && typeof data.encryptedPayloads === "object") {
      // Get conversation with participants to validate encryption
      const conversationForEncryption = await Conversation.findById(activeConversationId)
        .populate("participants", "publicEncryptionKey _id");

      if (conversationForEncryption) {
        // Validate all participants have encryption keys
        const { valid, missingKeys } = validateParticipantEncryption(
          conversationForEncryption.participants
        );

        if (!valid) {
          console.warn(
            `Cannot send encrypted message: Missing keys for ${missingKeys.join(", ")}`
          );
          // Allow graceful fallback - send as unencrypted if keys missing
        } else {
          // Validate individual E2E payloads
          let allPayloadsValid = true;
          const formattedPayloads: Record<string, any> = {};

          for (const [userId, payload] of Object.entries(data.encryptedPayloads)) {
            if (validateE2EEncryptedPayload(payload)) {
              formattedPayloads[userId] = payload;
            } else {
              console.warn(`Invalid E2E payload for user ${userId}`);
              allPayloadsValid = false;
            }
          }

          if (allPayloadsValid && Object.keys(formattedPayloads).length > 0) {
            validatedEncryptedPayloads = formattedPayloads;

            // Get message number from first payload for metadata
            const firstPayload = Object.values(formattedPayloads)[0] as any;
            const messageNumber = firstPayload?.messageNumber || 0;

            encryptionMetadata = generateEncryptionMetadata(
              `${activeConversationId}-${Date.now()}`,
              messageNumber
            );
          }
        }
      }
    }

    // 6. DB TRANSACTION CREATION
    const messagePayload: any = {
      conversationId: activeConversationId,
      senderId,
      content: validatedEncryptedPayloads ? data.content || "Encrypted message" : data.content,
      attachment: data.attachment,
      encrypted: Boolean(validatedEncryptedPayloads),
      replyTo: replyToMessageId,
      deliveredTo,
      seenBy: [senderId],
      disappearAfterMs: disappearAfterMs || null,
    };

    if (validatedEncryptedPayloads) {
      messagePayload.encryptedPayloads = validatedEncryptedPayloads;
      messagePayload.encryption = {
        scheme: "e2e-v1",
        version: 1,
        messageNumber: encryptionMetadata?.messageNumber || 0,
        sessionId: encryptionMetadata?.sessionId || null,
        encryptedAt: encryptionMetadata?.encryptedAt || new Date(),
      };
    }

    const message: any = await Message.create(messagePayload);

    const populatedMessage = await populateMessageById(message._id);
    if (!populatedMessage) throw new Error("Message populate failed");

    // FORMAT E2E ENCRYPTED MESSAGE IF APPLICABLE
    const formattedMessage = validatedEncryptedPayloads
      ? formatE2EEncryptedMessage(populatedMessage)
      : populatedMessage;

    const emittedMessage = {
      ...formattedMessage,
      clientId: clientTrackingId,
    };

    // Broadcast the new validated message to the room channel
    io.to(activeConversationId.toString()).emit("newMessage", {
      success: true,
      data: emittedMessage,
    });

    // 7. SYNC METADATA PREVIEWS AND CLEAR CACHE MASKS FOR RECIPIENTS
    const foreignParticipants = participantIds.filter((id) => id !== senderId);
    
    await Conversation.findByIdAndUpdate(activeConversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
      $pull: {
        clearedBy: {
          userId: { $in: foreignParticipants },
        },
      },
    });

    // Trigger parent component layout listener notifications updates
    await emitConversationUpdate(io, activeConversationId);

    // 8. OFF-CHANNEL BACKGROUND FCM PUSH NOTIFICATIONS DELIVERY
    const updatedConversation = await Conversation.findById(activeConversationId)
      .populate({
        path: "participants",
        select: "name avatar email fcmToken notificationsEnabled mutedConversations privateProfile showOnlineStatus isOnline lastSeen",
      })
      .lean();

    if (!updatedConversation) return;

    const participantsList = (updatedConversation.participants || []) as any[];
    const otherParticipants = participantsList.filter(
      (p) => p._id.toString() !== senderId
    );

    for (const user of otherParticipants) {
      const isOnline = onlineUserIds.has(user._id.toString());
      const isMuted = (user?.mutedConversations || []).some(
        (id: any) => id.toString() === activeConversationId.toString()
      );

      if (!isOnline && user.fcmToken && user.notificationsEnabled !== false && !isMuted) {
        await sendPushNotification({
          fcmToken: user.fcmToken,
          userId: user._id.toString(),
          title: populatedMessage.sender?.name || "New Message",
          body: data.content || "📷 Image attachment received",
          data: {
            conversationId: activeConversationId.toString(),
            senderId,
            conversationType: updatedConversation.type,
            conversationName:
              updatedConversation.type === "group"
                ? updatedConversation.name || "Group"
                : populatedMessage.sender?.name || "New Message",
            senderAvatar: populatedMessage.sender?.avatar || "",
          },
        });
      }
    }
  } catch (error) {
    console.error("Critical error in socket newMessage listener branch:", error);
    socket.emit("newMessage", {
      success: false,
      data: { clientId: clientTrackingId },
      msg: "An unexpected connection error occurred. Please try again.",
    });
  }
});

  socket.on("typing", async (data: { conversationId: string; senderId: string }) => {
    if (!data?.conversationId || !socket.data.userId) return;

    const conversation = await Conversation.findOne({
      _id: data.conversationId,
      participants: socket.data.userId,
    })
      .select("participants")
      .lean();

    if (!conversation) return;

    socket.to(data.conversationId).emit("typing", {
      success: true,
      data: {
        conversationId: data.conversationId,
        senderId: socket.data.userId,
      },
    });

    (conversation.participants || []).forEach((participantId: any) => {
      const nextId = participantId.toString();
      if (nextId !== socket.data.userId) {
        io.to(`user:${nextId}`).emit("conversationTyping", {
          success: true,
          data: {
            conversationId: data.conversationId,
            senderId: socket.data.userId,
          },
        });
      }
    });
  });

  socket.on("stopTyping", async (data: { conversationId: string; senderId: string }) => {
    if (!data?.conversationId || !socket.data.userId) return;

    const conversation = await Conversation.findOne({
      _id: data.conversationId,
      participants: socket.data.userId,
    })
      .select("participants")
      .lean();

    if (!conversation) return;

    socket.to(data.conversationId).emit("stopTyping", {
      success: true,
      data: {
        conversationId: data.conversationId,
        senderId: socket.data.userId,
      },
    });

    (conversation.participants || []).forEach((participantId: any) => {
      const nextId = participantId.toString();
      if (nextId !== socket.data.userId) {
        io.to(`user:${nextId}`).emit("conversationStopTyping", {
          success: true,
          data: {
            conversationId: data.conversationId,
            senderId: socket.data.userId,
          },
        });
      }
    });
  });

  socket.on("getMessages", async (data: { conversationId?: string; participants?: string[] }) => {
    try {
      const userId = socket.data.userId?.toString();

      if (!userId) {
        socket.emit("getMessages", {
          success: false,
          msg: "Unauthorized",
        });
        return;
      }

      let conversationId = data.conversationId;

      if (!conversationId && Array.isArray(data.participants) && data.participants.length >= 2) {
        const conversation = await Conversation.findOne({
          type: "direct",
          participants: { $all: data.participants, $size: 2 },
        })
          .select("_id")
          .lean();

        conversationId = conversation?._id?.toString?.();
      }

      if (!conversationId) {
        socket.emit("getMessages", {
          success: true,
          data: [],
        });
        return;
      }

      const messages = await getMessagesForConversation(conversationId, userId);

      await markMessagesDelivered(io, conversationId, userId);
      await markMessagesSeen(io, conversationId, userId);

      socket.emit("getMessages", {
        success: true,
        data: messages,
      });
    } catch (error) {
      console.log("getMessages error:", error);
      socket.emit("getMessages", {
        success: false,
        msg: "Failed to fetch message",
      });
    }
  });

  socket.on("editMessage", async (data) => {
    try {
      const userId = socket.data.userId?.toString();
      const message = await Message.findById(data.messageId);

      if (!message || message.senderId.toString() !== userId) {
        socket.emit("editMessage", { success: false, msg: "Message not found" });
        return;
      }

      if (message.isDeleted) {
        socket.emit("editMessage", {
          success: false,
          msg: "Deleted messages cannot be edited",
        });
        return;
      }

      if (Date.now() - new Date(message.createdAt).getTime() > EDIT_WINDOW_MS) {
        socket.emit("editMessage", {
          success: false,
          msg: "You can only edit a message within 3 minutes of sending it",
        });
        return;
      }

      const nextContent = (data.content || "").trim();

      if (!nextContent) {
        socket.emit("editMessage", {
          success: false,
          msg: "Message content is required",
        });
        return;
      }

      message.content = nextContent;
      message.editedAt = new Date();
      await message.save();

      const finalMsg = await populateMessageById(message._id);

      if (!finalMsg) return;

      io.to(message.conversationId.toString()).emit("messageEdited", {
        success: true,
        data: finalMsg,
      });

      socket.emit("editMessage", {
        success: true,
        data: finalMsg,
      });

      const conversation = await Conversation.findById(message.conversationId).lean();
      if (conversation?.lastMessage?.toString() === message._id.toString()) {
        await emitConversationUpdate(io, message.conversationId.toString());
      }
    } catch (error) {
      console.log("editMessage error:", error);
      socket.emit("editMessage", {
        success: false,
        msg: "Failed to edit message",
      });
    }
  });

  socket.on("deleteMessage", async (data) => {
    try {
      const userId = socket.data.userId?.toString();
      const message = await Message.findById(data.messageId);

      if (!message || message.senderId.toString() !== userId) {
        socket.emit("deleteMessage", { success: false, msg: "Message not found" });
        return;
      }

      message.content = "";
      message.attachment = "";
      message.replyTo = null;
      message.isDeleted = true;
      message.deletedForEveryone = true;
      message.editedAt = new Date();
      await message.save();

      const finalMsg = await populateMessageById(message._id);

      if (!finalMsg) return;

      io.to(message.conversationId.toString()).emit("messageDeleted", {
        success: true,
        data: finalMsg,
      });

      socket.emit("deleteMessage", {
        success: true,
        data: finalMsg,
      });

      const conversation = await Conversation.findById(message.conversationId).lean();
      if (conversation?.lastMessage?.toString() === message._id.toString()) {
        await emitConversationUpdate(io, message.conversationId.toString());
      }
    } catch (error) {
      console.log("deleteMessage error:", error);
      socket.emit("deleteMessage", {
        success: false,
        msg: "Failed to delete message",
      });
    }
  });

  socket.on(
    "markConversationSeen",
    async (data: { conversationId?: string; messageIds?: string[] }) => {
      try {
        const userId = socket.data.userId?.toString();
        const conversationId = data?.conversationId?.toString();

        if (!userId || !conversationId) return;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        })
          .select("_id")
          .lean();

        if (!conversation) return;

        await markMessagesSeen(io, conversationId, userId, data?.messageIds);
      } catch (error) {
        console.log("markConversationSeen error:", error);
      }
    }
  );

  socket.on("clearChat", async (data: { conversationId: string; scope?: "me" | "everyone" }) => {
    try {
      const userId = socket.data.userId?.toString();
      const conversationId = data?.conversationId;
      const scope = data?.scope || "me";

      if (!userId || !conversationId) {
        socket.emit("clearChat", {
          success: false,
          msg: "Conversation not found",
        });
        return;
      }

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });

      if (!conversation) {
        socket.emit("clearChat", {
          success: false,
          msg: "Conversation not found",
        });
        return;
      }

      const clearedAt = new Date();

      if (scope === "everyone") {
        await Message.deleteMany({ conversationId });
        conversation.lastMessage = null as any;
        conversation.clearedBy = [];
      } else {
        const nextEntries = (conversation.clearedBy || []).filter(
          (entry: any) => entry.userId?.toString?.() !== userId
        );
        nextEntries.push({ userId, clearedAt } as any);
        conversation.clearedBy = nextEntries as any;
      }

      conversation.updatedAt = clearedAt;
      await conversation.save();

      const basePayload = {
        conversationId,
        scope,
        clearedAt: clearedAt.toISOString(),
      };

      if (scope === "everyone") {
        io.to(conversationId).emit("chatCleared", {
          success: true,
          data: basePayload,
        });
      } else {
        socket.emit("chatCleared", {
          success: true,
          data: basePayload,
        });
      }

      await emitConversationUpdate(io, conversationId);
    } catch (error) {
      console.log("clearChat error:", error);
      socket.emit("clearChat", {
        success: false,
        msg: "Failed to clear chat",
      });
    }
  });
}
