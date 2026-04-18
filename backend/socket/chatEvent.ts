import type { Server as SocketIOServer, Socket } from "socket.io";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { sendPushNotification } from "../Utils/sendPush.js";
import type { PopulatedUser } from "../types.js";

export function registerChatEvents(io: SocketIOServer, socket: Socket) {

  //  Join any conversation room (important for realtime updates)
  socket.on("joinConversation", (conversationId: string) => {
    if (!conversationId) return;
    socket.join(conversationId.toString());
    // console.log("joined conversation room:", conversationId);
  });

  //  Inbox conversations list
  socket.on("getConversations", async () => {
    console.log("getConversations event!");

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
        .populate({
          path: "lastMessage",
          select: "content senderId attachment createdAt",
        })
        .populate({
          path: "participants",
          select: "name avatar email",
        })
        .lean();

      socket.emit("getConversations", {
        success: true,
        data: conversations,
      });
    } catch (error: any) {
      console.log("getConversations error: ", error);

      socket.emit("getConversations", {
        success: false,
        msg: "Failed to fetch conversations",
      });
    }
  });

  // Create new conversation
  socket.on("newConversation", async (data) => {
    // console.log("newConversation event:", data);

    try {
      // If direct conversation, check if already exists
      if (data.type === "direct") {
        const existingConversation = await Conversation.findOne({
          type: "direct",
          participants: { $all: data.participants, $size: 2 },
        })
          .populate({
            path: "participants",
            select: "name avatar email",
          })
          .lean();

        if (existingConversation) {
          socket.emit("newConversation", {
            success: true,
            data: { ...existingConversation, isNew: false },
          });
          return;
        }
      }

      const newConv = await Conversation.create({
        type: data.type,
        participants: data.participants,
        name: data.name,
        avatar: data.avatar,
        createdBy: socket.data.userId,
      });

      // join online participants to room
      const connectedSockets = Array.from(io.sockets.sockets.values()).filter(
        (s) => data.participants.includes(s.data.userId)
      );

      connectedSockets.forEach((participantSocket) => {
        participantSocket.join(newConv._id.toString());
      });

      const populatedConversation = await Conversation.findById(newConv._id)
        .populate({
          path: "participants",
          select: "name avatar email",
        })
        .lean();

      if (!populatedConversation) throw new Error("Failed to populate conversation");

      io.to(newConv._id.toString()).emit("newConversation", {
        success: true,
        data: { ...populatedConversation, isNew: true },
      });
    } catch (error: any) {
      console.log("newConversation error:", error);

      socket.emit("newConversation", {
        success: false,
        msg: "Failed to create conversation",
      });
    }
  });

  // Send new message

  socket.on("newMessage", async (data) => {
    try {
      const message = await Message.create({
        conversationId: data.conversationId,
        senderId: data.sender.id,
        content: data.content,
        attachment: data.attachment,
      });

      const populatedMessage = await Message.findById(message._id)
        .populate({ path: "senderId", select: "name avatar" })
        .lean();

      if (!populatedMessage) throw new Error("Message populate failed");

      const populatedSender = populatedMessage.senderId as PopulatedUser | null;

      const finalMsg = {
        ...populatedMessage,
        id: populatedMessage._id,
        sender: {
          id: populatedSender?._id,
          name: populatedSender?.name,
          avatar: populatedSender?.avatar,
        },
      };

      io.to(data.conversationId.toString()).emit("newMessage", {
        success: true,
        data: finalMsg,
      });

      await Conversation.findByIdAndUpdate(data.conversationId, {
        lastMessage: message._id,
        updatedAt: new Date(),
      });

      const updatedConversation = await Conversation.findById(data.conversationId)
        .populate({ path: "lastMessage", select: "content senderId attachment createdAt" })
        .populate({ path: "participants", select: "name avatar email expoPushToken" })
        .lean();

      if (!updatedConversation) return;

      io.to(data.conversationId.toString()).emit("conversationUpdated", {
        success: true,
        data: updatedConversation,
      });

      const senderId = data.sender.id.toString();

      const participants = (updatedConversation?.participants || []) as PopulatedUser[];

      const otherParticipants = participants.filter(
        (p) => p._id.toString() !== senderId
      );

      const onlineUserIds = new Set(
        Array.from(io.sockets.sockets.values())
          .map((s) => s.data.userId?.toString())
          .filter(Boolean)
      );

      for (const user of otherParticipants) {
        const isOnline = onlineUserIds.has(user._id.toString());

        if (!isOnline && user.expoPushToken) {
          await sendPushNotification({
            expoPushToken: user.expoPushToken,
            title: finalMsg.sender.name || "New Message",
            body: data.content || "New message received",
            data: {
              conversationId: data.conversationId,
              senderId: senderId,
            },
          });
        }
      }
    } catch (error) {
      console.log("newMessage error:", error);

      socket.emit("newMessage", {
        success: false,
        msg: "Failed to send message",
      });
    }
  });


  //  Get messages for chat screen
  socket.on("getMessages", async (data: { conversationId: string }) => {
    try {
      //   console.log("get message!", data.conversationId);

      const messages = await Message.find({
        conversationId: data.conversationId,
      })
        .sort({ createdAt: -1 })
        .populate({
          path: "senderId",
          select: "name avatar",
        })
        .lean();

      const messagesWithSender = messages.map((message: any) => ({
        ...message,
        id: message._id,
        sender: {
          id: message.senderId?._id,
          name: message.senderId?.name,
          avatar: message.senderId?.avatar,
        },
      }));

      socket.emit("getMessages", {
        success: true,
        data: messagesWithSender,
      });
    } catch (error) {
      console.log("getMessages error:", error);

      socket.emit("getMessages", {
        success: false,
        msg: "Failed to fetch message",
      });
    }
  });
}
