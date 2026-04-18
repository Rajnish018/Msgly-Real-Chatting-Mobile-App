import AsyncStorage from "@react-native-async-storage/async-storage";
import { io, Socket } from "socket.io-client";

import { API_URL } from "@/constants";

let socket: Socket | null = null;

export async function connectSocket(
  manualToken?: string | null
): Promise<Socket> {
  const token = manualToken || (await AsyncStorage.getItem("token"));

  if (!token) {
    throw new Error("No token found. User must login first");
  }

  //  prevent multiple socket objects
  if (!socket) {
    socket = io(API_URL, {
      auth: { token },
      //   transports: ["websocket"], //  recommended in RN
    });

    //  wait for connection properly
    await new Promise((resolve) => {
      socket!.on("connect", () => {
        console.log("Socket connected:", socket!.id);
        resolve(true);
      });

      //   socket!.on("connect_error", (err) => {
      //     console.log(" Socket connect error:", err.message);
      //     reject(err);
      //   });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:");
    });
  }

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log(" Socket disconnected manually");
  }
}
