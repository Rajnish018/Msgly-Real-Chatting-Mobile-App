import { createContext, ReactNode, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "expo-router";

import { login, register } from "@/services/authService";
import { AuthContextProps, DecodedTokenProps, UserProps } from "@/types";

import { connectSocket, disconnectSocket, getSocket } from "@/socket/socket";
import { registerForPushNotificationsAsync } from "@/utils/registerForPush";

export const AuthContext = createContext<AuthContextProps>({
  token: null,
  user: null,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateToken: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProps | null>(null);

  const router = useRouter();

  //  Navigation helpers
  const gotoWelcomePage = () => {
    setTimeout(() => {
      router.replace("/(auth)/welcome");
    }, 1500);
  };

  const gotoHomePage = () => {
    setTimeout(() => {
      router.replace("/(main)/home");
    }, 1500);
  };

  //  Send Expo Push Token to backend via socket event
  const syncPushTokenToBackend = async () => {
    try {
      const expoToken = await registerForPushNotificationsAsync();
      console.log("expoToken:", expoToken);

      if (!expoToken) return;

      const s = getSocket();

      if (s?.connected) {
        s.emit("updatePushToken", { expoPushToken: expoToken });

        // optional: listen ack (if backend emits response)
        // s.once("updatePushToken", (res) => console.log("push token saved:", res));
      } else {
        console.log("Socket not connected, cannot send expoPushToken");
      }
    } catch (err: any) {
      console.log("Push token sync failed:", err.message);
    }
  };

  // Load token on app start
  const loadToken = async () => {
    const storedToken = await AsyncStorage.getItem("token");

    if (!storedToken) {
      gotoWelcomePage();
      return;
    }

    try {
      const decoded = jwtDecode<DecodedTokenProps>(storedToken);

      //  token expired
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        await AsyncStorage.removeItem("token");
        gotoWelcomePage();
        return;
      }

      //  user logged in
      setToken(storedToken);
      setUser(decoded.user);

      try {
        // connect socket using stored token
        await connectSocket(storedToken);

        // send expo push token to backend
        await syncPushTokenToBackend();
      } catch (err: any) {
        console.log("Socket connect failed:", err.message);
      }

      gotoHomePage();
    } catch (error) {
      console.log("failed to decode token:", error);
      await AsyncStorage.removeItem("token");
      gotoWelcomePage();
    }
  };

  useEffect(() => {
    loadToken();
  }, []);

  //  Called after login/register
  const updateToken = async (newToken: string) => {
    if (!newToken) return;

    setToken(newToken);
    await AsyncStorage.setItem("token", newToken);

    const decoded = jwtDecode<DecodedTokenProps>(newToken);
    setUser(decoded.user);

    try {
      // connect socket first (token is required for socket auth)
      await connectSocket(newToken);

      // send expo push token
      await syncPushTokenToBackend();
    } catch (err: any) {
      console.log("Socket connect failed:", err.message);
    }
  };

  // Login
  const signIn = async (email: string, password: string) => {
    const response = await login(email, password);

    await updateToken(response.token);

    router.replace("/(main)/home");
  };

  // Register
  const signUp = async (
    email: string,
    password: string,
    name: string,
    avatar?: string | null
  ) => {
    const response = await register(email, password, name, avatar);

    await updateToken(response.token);

    router.replace("/(main)/home");
  };

  // Logout
  const signOut = async () => {
    setToken(null);
    setUser(null);

    await AsyncStorage.removeItem("token");

    disconnectSocket();

    router.replace("/(auth)/welcome");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        signIn,
        signUp,
        signOut,
        updateToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
