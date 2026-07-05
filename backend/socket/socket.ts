import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer, Socket } from "socket.io";
import { permanentlyDeleteAccountByUserId, purgeExpiredDeactivatedAccounts } from "../Utils/accountLifecycle.js";
import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";
import { registerChatEvents } from "./chatEvent.js";
import { registerUserEvents } from "./userEvent.js";

dotenv.config();

const emitPresenceToContacts = async (
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

  const targetUserIds = new Set<string>();

  conversations.forEach((conversation: any) => {
    (conversation.participants || []).forEach((participantId: any) => {
      const nextId = participantId.toString();
      if (nextId !== userId) {
        targetUserIds.add(nextId);
      }
    });
  });

  targetUserIds.forEach((participantId) => {
    io.to(`user:${participantId}`).emit("presenceUpdated", payload);
  });
};

export function initializeSocket(server: any): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
    },
  });

  io.use(async (socket: Socket, next) => {
    try {
      await purgeExpiredDeactivatedAccounts();

      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication error: no token provided"));
      }

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
      const userId = decoded?.user?.id;

      if (!userId) {
        return next(new Error("Authentication error: invalid token"));
      }

      const user = await User.findById(userId)
        .select("name email avatar bio privateProfile showOnlineStatus notificationsEnabled tokenVersion accountStatus scheduledDeletionAt")
        .lean();

      if (!user) {
        return next(new Error("Authentication error: invalid token"));
      }

      if ((decoded?.user?.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
        return next(new Error("Authentication error: session expired"));
      }

      if (user.accountStatus === "deactivated") {
        const scheduledDeletionAt = user.scheduledDeletionAt
          ? new Date(user.scheduledDeletionAt)
          : null;

        if (scheduledDeletionAt && scheduledDeletionAt <= new Date()) {
          await permanentlyDeleteAccountByUserId(userId);
        }

        return next(new Error("Authentication error: account deactivated"));
      }

      socket.data = {
        ...decoded.user,
        ...user,
        userId: user._id.toString(),
      };

      next();
    } catch (error) {
      next(new Error("Authentication error: invalid token"));
    }
  });

 io.on("connection", async (socket: Socket) => {
    // 1. SAFE AUTHENTICATED USER ID EXTRACTION
    const userId = socket.data.userId?.toString();

    if (!userId) {
      console.log(`[Socket] Unauthorized connection attempt dropped. Socket ID: ${socket.id}`);
      socket.disconnect(true); // Force close unauthenticated connections violently
      return;
    }

    // 2. JOIN PRIVATE MULTI-DEVICE USER ROOM INSTANTLY
    // This groups all concurrent connections (tabs, apps) under a single user room channel
    await socket.join(`user:${userId}`);
    console.log(`[Socket] Connected | User: ${userId} | Socket ID: ${socket.id}`);

    try {
      // 3. FETCH CURRENT CONCURRENT SESSION COUNT FOR THIS ROOM
      const activeSocketsInRoom = await io.in(`user:${userId}`).fetchSockets();
      const concurrentSessionsCount = activeSocketsInRoom.length;

      // 4. ONLY TRIGGER "ONLINE" ACTIONS ON THE VERY FIRST CONNECTION
      if (concurrentSessionsCount === 1) {
        const activeUser = await User.findByIdAndUpdate(
          userId,
          { isOnline: true, lastSeen: null },
          { new: true }
        )
          .select("showOnlineStatus")
          .lean();

        if (activeUser?.showOnlineStatus !== false) {
          await emitPresenceToContacts(io, userId, {
            userId,
            isOnline: true,
            lastSeen: null,
            showOnlineStatus: true,
          });
        }
        console.log(`[Presence] User ${userId} is now uniquely ONLINE.`);
      } else {
        console.log(`[Presence] User ${userId} connected an additional session (${concurrentSessionsCount} total active devices). DB update skipped.`);
      }

      // 5. ATTACH CHAT & APPLICATION EVENT LISTENERS
      registerChatEvents(io, socket);
      registerUserEvents(io, socket);

      // 6. JOIN ALL ACTIVE HISTORICAL CONVERSATION CHANNELS
      const conversations = await Conversation.find({
        participants: userId,
      }).select("_id").lean();

      conversations.forEach((conversation) => {
        socket.join(conversation._id.toString());
      });

    } catch (error) {
      console.error(`[Socket Error] Critical initialization failure for user ${userId}:`, error);
    }

    // ========================================================
    // SOCKET DISCONNECT LIFECYCLE
    // ========================================================
    socket.on("disconnect", async (reason) => {
      console.log(`[Socket] Disconnecting | User: ${userId} | Socket ID: ${socket.id} | Reason: ${reason}`);

      try {
        // 7. CHECK REMAINING CONCURRENT CONNECTIONS IN USER ROOM
        const remainingSockets = await io.in(`user:${userId}`).fetchSockets();
        const activeConnectionsLeft = remainingSockets.length;

        // 8. ONLY MARK "OFFLINE" WHEN THE VERY LAST DEVICE SESSIONS DROPS
        // This completely guards against network flapping (e.g., Cellular to Wi-Fi switches)
        if (activeConnectionsLeft === 0) {
          const offlineTimestamp = new Date();

          const latestUser = await User.findByIdAndUpdate(
            userId,
            { isOnline: false, lastSeen: offlineTimestamp },
            { new: true }
          )
            .select("showOnlineStatus lastSeen")
            .lean();

          if (latestUser?.showOnlineStatus !== false) {
            await emitPresenceToContacts(io, userId, {
              userId,
              isOnline: false,
              lastSeen: latestUser?.lastSeen ?? offlineTimestamp,
              showOnlineStatus: true,
            });
          }
          console.log(`[Presence] User ${userId} has no sessions left. Marked completely OFFLINE.`);
        } else {
          console.log(`[Presence] User ${userId} closed 1 pipe. Active session maintained via ${activeConnectionsLeft} remaining connections.`);
        }
      } catch (error) {
        console.error(`[Socket Error] Disconnect tracking exception for user ${userId}:`, error);
      }
    });
  });

  return io;
}
