import { Socket, Server as SocketIOServer } from "socket.io";
import User from "../models/user.model.js";
import { generateToken } from "../Utils/token.js";

export function registerUserEvents(io: SocketIOServer, socket: Socket) {

  // ✅ client -> server event
  socket.on("testSocket", (data) => {
    console.log("testSocket received:", data);

    socket.emit("testSocket", {
      success: true,
      msg: "its working!!",
      data,
    });
  });

  // ✅ update profile event (separate)
  socket.on("updateProfile", async (data: { name?: string; avatar?: string }) => {
    console.log("updateprofile event: ", data);

    const userId = socket.data.userId;

    if (!userId) {
      return socket.emit("updateProfile", {
        success: false,
        msg: "Unauthorized",
      });
    }

    try {
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { name: data.name, avatar: data.avatar },
        { new: true }
      );

      if (!updatedUser) {
        return socket.emit("updateProfile", {
          success: false,
          msg: "User not found",
        });
      }

      const newToken = generateToken(updatedUser);

      socket.emit("updateProfile", {
        success: true,
        data: { token: newToken },
        msg: "Profile updated successfully",
      });
    } catch (error) {
      console.log("Error updating profile: ", error);

      socket.emit("updateProfile", {
        success: false,
        msg: "Error updating profile",
      });
    }
  }
);


socket.on("getContacts", async () => {
  try {
    const currentUserId = socket.data.userId;
    
    console.log(currentUserId)

    if (!currentUserId) {
      return socket.emit("getContacts", {
        success: false,
        msg: "Unauthorized (userId missing)",
      });
    }

    const users = await User.find(
      { _id: { $ne: currentUserId } },
      { password: 0 }
    ).lean();

    const contacts = users.map((user: any) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar || "",
      isOnline: user.isOnline || false,
  lastSeen: user.lastSeen || null,
    }));

    socket.emit("getContacts", {
      success: true,
      data: contacts,
    });

  } catch (error: any) {
    console.log("getContacts error:", error);

    socket.emit("getContacts", {
      success: false,
      msg: "Failed to fetch contacts",
    });
  }
  })


  socket.on("updatePushToken", async (data) => {
    try {
      const userId = socket.data.userId; 
      const { expoPushToken } = data;

      if (!expoPushToken) {
        socket.emit("updatePushToken", { success: false, msg: "Token missing" });
        return;
      }

      await User.findByIdAndUpdate(userId, { expoPushToken });

      socket.emit("updatePushToken", { success: true, msg: "Token saved" });
    } catch (err) {
      console.log("updatePushToken error:", err);
      socket.emit("updatePushToken", { success: false, msg: "Server error" });
    }
  });

  // ✅ Typing Indicator (client -> server -> receiver)
socket.on("typing:start", ({ toUserId }: { toUserId: string }) => {
  const fromUserId = socket.data.userId;

  if (!fromUserId || !toUserId) return;

  // send to receiver personal room
  io.to(toUserId).emit("typing", {
    fromUserId,
    isTyping: true,
  });
});

socket.on("typing:stop", ({ toUserId }: { toUserId: string }) => {
  const fromUserId = socket.data.userId;

  if (!fromUserId || !toUserId) return;

  io.to(toUserId).emit("typing", {
    fromUserId,
    isTyping: false,
  });
});



}
