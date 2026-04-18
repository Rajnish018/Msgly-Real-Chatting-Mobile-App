import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Server as SocketIOServer, Socket } from "socket.io";
import { registerUserEvents } from "./userEvent.js";
import { registerChatEvents } from "./chatEvent.js";
import Conversation from "../models/conversation.model.js";
import User from "../models/user.model.js";

dotenv.config();

export function initializeSocket(server: any): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*", //  allow all (for dev)
    },
  });

  //  Auth middleware (runs before connection)
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: no token provided"));
    }

    jwt.verify(token, process.env.JWT_SECRET as string, (err:any, decoded: any) => {
      if (err) {
        return next(new Error("Authentication error: invalid token"));
      }

      //  decoded must contain user object (based on your JWT structure)
      let userData = decoded.user;

      // IMPORTANT FIX: socket.data is an object (don't overwrite it)
      socket.data = userData;
      socket.data.userId = userData.id;

      next();
    });
  });

  //  Connection event
  io.on("connection",async (socket: Socket) => {
    const userId = socket.data.userId;
    const username = socket.data?.name;

    console.log(` User connected: ${userId}, username: ${username}`);

    //  mark online
  await User.findByIdAndUpdate(userId, {
    isOnline: true,
    lastSeen: null,
  });

    
     // register all user events here
    registerChatEvents(io,socket);
    registerUserEvents(io, socket);

    // join all the convesations the user is part of
    try{
      const conversations=await Conversation.find({
        participants:userId
      }).select("_id")

      conversations.forEach((conversation)=>{
        socket.join(conversation._id.toString());

      })

    }catch(error:any){
      console.log("Error joining conversations:",error)
    }
    //  Disconnect
    socket.on("disconnect",async () => {
      
      console.log(` User disconnected: ${userId}`);

      await User.findByIdAndUpdate(userId, {
      isOnline: false,
      lastSeen: new Date(),
    });
    });
  });

  return io;
}
