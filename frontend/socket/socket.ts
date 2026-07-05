import AsyncStorage from "@react-native-async-storage/async-storage";
import secureTokenStorage from "@/services/secureTokenStorage";
import { io, Socket } from "socket.io-client";
import { API_URL } from "@/constants";

let socket: Socket | null = null;
let activeToken: string | null = null;

async function waitForSocketConnection(targetSocket: Socket, token: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const handleConnect = () => {
      targetSocket.off("connect_error", handleConnectError);
      activeToken = token;
      resolve();
    };

    const handleConnectError = (err: Error) => {
      targetSocket.off("connect", handleConnect);
      reject(err);
    };

    targetSocket.once("connect", handleConnect);
    targetSocket.once("connect_error", handleConnectError);
  });
}

export async function connectSocket(manualToken?: string | null): Promise<Socket> {
  const token = manualToken || (await secureTokenStorage.getToken());

  if (!token) {
    throw new Error("No token found. User must login first");
  }

  if (!socket) {
    socket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: false,
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  }

  if (socket.connected && activeToken === token) {
    return socket;
  }

  socket.auth = { token };

  if (socket.connected && activeToken !== token) {
    socket.disconnect();
  }

  socket.connect();
  await waitForSocketConnection(socket, token);

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function isSocketConnected(): boolean {
  return Boolean(socket?.connected);
}

export function onSocketEvent(
  event: "connect" | "disconnect" | "connect_error",
  handler: (...args: any[]) => void
): () => void {
  if (!socket) {
    return () => {};
  }

  socket.on(event, handler);

  return () => {
    socket?.off(event, handler);
  };
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    activeToken = null;
  }
}
