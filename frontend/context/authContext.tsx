import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "expo-router";
import { login, register } from "@/services/authService";
import secureTokenStorage from "@/services/secureTokenStorage";
import { AuthContextProps, ConversationProps, DecodedTokenProps, UserProps } from "@/types";
import { connectSocket, disconnectSocket, getSocket } from "@/socket/socket";
import { getConversations } from "@/socket/socketEvents";
import { onTokenRefresh, registerForPushNotificationsAsync } from "@/utils/registerForPush";
import AsyncStorage from "@react-native-async-storage/async-storage";
import nacl from "tweetnacl";
import { decodeBase64, encodeBase64, decodeUTF8, encodeUTF8 } from "tweetnacl-util";
import * as SecureStore from "expo-secure-store";
import { sanitizeSecureStoreKey, validateSecureStoreKey } from "@/services/secureTokenStorage";
import { pbkdf2SHA512 } from "@/hooks/useE2EE";

export const AuthContext = createContext<AuthContextProps>({
  token: null,
  user: null,
  appReady: false,
  preloadedConversations: [],
  setPreloadedConversations: (() => undefined) as any,
  preloadConversations: async () => [],
  signIn: async () => {},
  signUp: async () => {},
  logOut: async (onBeforeLogout?: () => Promise<void> | void) => {},
  updateToken: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProps | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [preloadedConversations, setPreloadedConversations] = useState<ConversationProps[]>([]);
  const router = useRouter();

  const syncPushTokenToBackend = async () => {
    try {
      const notificationsEnabled = await AsyncStorage.getItem("notificationsEnabled");
      if (notificationsEnabled === "false") {
        getSocket()?.emit("updatePushToken", { fcmToken: null });
        return;
      }

      const fcmToken = await registerForPushNotificationsAsync();
      if (!fcmToken) return;

      getSocket()?.emit("updatePushToken", { fcmToken: fcmToken });
    } catch (err: any) {
      console.log("Push token sync failed:", err.message);
    }
  };

  const preloadConversations = async (manualToken?: string | null) => {
    try {
      await connectSocket(manualToken || token);
    } catch (error) {
      return [];
    }

    return await new Promise<ConversationProps[]>((resolve) => {
      let isResolved = false;

      const handler = (response: any) => {
        if (isResolved) return;
        isResolved = true;
        getConversations(handler, true);
        const nextConversations = response?.success ? response.data || [] : [];
        setPreloadedConversations(nextConversations);
        resolve(nextConversations);
      };

      getConversations(handler);
      getConversations({});

      // Fallback timeout to prevent app from hanging on splash screen
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          getConversations(handler, true);
          console.warn("preloadConversations timed out");
          resolve([]);
        }
      }, 3000);
    });
  };

  const bootstrapSession = async (storedToken: string) => {
    try {
      await connectSocket(storedToken);
      await syncPushTokenToBackend();
      await preloadConversations(storedToken);
    } catch (error) {
      // Socket startup is best-effort; a timeout should not invalidate a saved session.
    }
  };

  const hydrateSession = (storedToken: string) => {
    const decoded = jwtDecode<DecodedTokenProps>(storedToken);

    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      throw new Error("Token expired");
    }

    setToken(storedToken);
    setUser(decoded.user);
  };

  const getIdentityStorageKey = (userId: string) => {
    const storageKey = `msglyEncryptionKeyPair_${userId}`;
    const sanitizedKey = sanitizeSecureStoreKey(storageKey);
    validateSecureStoreKey(sanitizedKey);
    return sanitizedKey;
  };

  const restoreEncryptionIdentityFromBackup = async (
    accountUser: any,
    password: string
  ) => {
    const userId = accountUser?.id || accountUser?._id;
    const publicKey = accountUser?.publicEncryptionKey;
    const backup = accountUser?.encryptedPrivateKeyBackup;

    if (!userId || !publicKey || !backup?.ciphertext || !backup?.nonce) return;

    const identityStorageKey = getIdentityStorageKey(String(userId));
    const existingIdentityRaw = await SecureStore.getItemAsync(identityStorageKey);

    if (existingIdentityRaw) {
      try {
        const existingIdentity = JSON.parse(existingIdentityRaw);
        if (existingIdentity?.publicKey === publicKey && existingIdentity?.secretKey) {
          return;
        }
      } catch {
        // Fall through and rebuild from the encrypted account backup.
      }
    }

    const salt = String(accountUser.email || "").toLowerCase().trim();
    const derivedKey = pbkdf2SHA512(password, salt);
    const decryptedSecretKey = nacl.secretbox.open(
      decodeBase64(backup.ciphertext),
      decodeBase64(backup.nonce),
      derivedKey
    );

    if (!decryptedSecretKey) {
      console.warn("Could not restore encryption identity from encrypted backup.");
      return;
    }

    const secretKeyBase64 = encodeUTF8(decryptedSecretKey);
    const identity = {
      publicKey,
      secretKey: secretKeyBase64,
      encryptedSecretKeyBackup: backup,
      version: 1,
    };

    await SecureStore.setItemAsync(identityStorageKey, JSON.stringify(identity));
    await SecureStore.setItemAsync(`msglyPrivateKey_${userId}`, JSON.stringify(backup));
    await SecureStore.setItemAsync(`msglyPublicKey_${userId}`, publicKey);
  };

  const loadToken = async () => {
    try {
      // Try to get token from secure storage first
      let storedToken = await secureTokenStorage.getToken();

      // Fallback: check AsyncStorage for legacy stored tokens and migrate
      if (!storedToken) {
        const legacyToken = await AsyncStorage.getItem("token");
        if (legacyToken) {
          // Migrate legacy token to secure storage
          await secureTokenStorage.setToken(legacyToken);
          storedToken = legacyToken;
          // Clear legacy storage
          await AsyncStorage.removeItem("token");
        }
      }

      if (!storedToken) {
        setAppReady(true);
        router.replace("/(auth)/welcome");
        return;
      }

      hydrateSession(storedToken);
      setAppReady(true);
      bootstrapSession(storedToken).catch((error) => {
        // Saved auth is already valid; socket bootstrap can retry from app screens.
      });
    } catch (error) {
      console.log("failed to restore session:", error);
      try {
        await secureTokenStorage.clearTokens();
      } catch (e) {
        // Silent fail on clear
      }
      await AsyncStorage.multiRemove(["token", "biometricLockEnabled"]);
      disconnectSocket();
      setToken(null);
      setUser(null);
      setPreloadedConversations([]);
      setAppReady(true);
      router.replace("/(auth)/welcome");
    }
  };

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    if (!token) return;

    const unsubscribe = onTokenRefresh((nextToken) => {
      const trimmedToken = nextToken?.trim();
      if (!trimmedToken) return;

      getSocket()?.emit("updatePushToken", { fcmToken: trimmedToken });
    });

    return unsubscribe;
  }, [token]);

  const updateToken = async (newToken: string) => {
    if (!newToken) return;

    try {
      setToken(newToken);
      
      // Store in secure storage
      await secureTokenStorage.setToken(newToken);

      const decoded = jwtDecode<DecodedTokenProps>(newToken);
      setUser(decoded.user);

      connectSocket(newToken)
        .then(() => syncPushTokenToBackend())
        .catch((error) => {
          // Socket bootstrap is best-effort after token persistence.
        });
    } catch (error) {
      console.error("Failed to update token:", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    const response = await login(email, password);
    await restoreEncryptionIdentityFromBackup(response.user, password);
    await updateToken(response.token);
    preloadConversations(response.token).catch((err) =>
      console.warn("Background preload failed:", err)
    );
    router.replace("/(main)/home");
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    avatar?: string | null
  ) => {
    // 1. Generate new Curve25519 identity keypair
    const keyPair = nacl.box.keyPair();
    const publicKeyBase64 = encodeBase64(keyPair.publicKey);
    const secretKeyBase64 = encodeBase64(keyPair.secretKey);

    // 2. Encrypt the private key using password-derived key (PBKDF2)
    const salt = email.toLowerCase().trim();
    const derivedKey = pbkdf2SHA512(password, salt);
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const encryptedSecretKey = nacl.secretbox(
      decodeUTF8(secretKeyBase64),
      nonce,
      derivedKey
    );

    const privateKeyBundle = {
      ciphertext: encodeBase64(encryptedSecretKey),
      nonce: encodeBase64(nonce),
    };

    // 3. Call register API passing public key and encrypted backup so reinstall can restore keys
    const response = await register(
      email,
      password,
      name,
      avatar,
      publicKeyBase64,
      privateKeyBundle
    );

    // 4. Save both keys to SecureStore (under userId)
    const userId = (response as any).user?.id || (response as any).user?._id;
    if (userId) {
      const storageKey = `msglyEncryptionKeyPair_${userId}`;
      const sanitizedKey = sanitizeSecureStoreKey(storageKey);
      validateSecureStoreKey(sanitizedKey);

      // Storing in the exact StoredKeyPair structure that getStoredKeyPair expects
      const identity = {
        publicKey: publicKeyBase64,
        secretKey: secretKeyBase64,
        encryptedPrivateKeyBackup: privateKeyBundle,
        version: 1,
      };

      await SecureStore.setItemAsync(sanitizedKey, JSON.stringify(identity));
      // Also save encrypted private key for useE2EE hook
      await SecureStore.setItemAsync(`msglyPrivateKey_${userId}`, JSON.stringify(privateKeyBundle));
      await SecureStore.setItemAsync(`msglyPublicKey_${userId}`, publicKeyBase64);
    }

    await updateToken(response.token);
    preloadConversations(response.token).catch((err) =>
      console.warn("Background preload failed:", err)
    );
    router.replace("/(main)/home");
  };

 const logOut = async (onBeforeLogout?: () => Promise<void> | void) => {
  // 1. Run the language/settings reset if provided
  if (onBeforeLogout) {
    await onBeforeLogout();
  }

  // 2. Clear Auth State
  setToken(null);
  setUser(null);
  setPreloadedConversations([]);

  // 3. Clear Secure Storage
  try {
    await secureTokenStorage.clearTokens();
  } catch (err) {
    console.log("Error clearing secure storage on logout:", err);
  }

  // 4. Clear AsyncStorage
  try {
    await Promise.all([
      AsyncStorage.removeItem("token"),
      AsyncStorage.removeItem("biometricLockEnabled"),
      AsyncStorage.removeItem("appLanguage"),
      AsyncStorage.removeItem("notificationsEnabled"),
      AsyncStorage.removeItem("mutedConversationIds"),
      AsyncStorage.removeItem("userSettings"),
      AsyncStorage.removeItem("userSettingsEmail"),
    ]);
  } catch (err) {
    console.log("Error clearing storage on logout:", err);
  }

  // 5. Cleanup & Navigate
  disconnectSocket();
  router.replace("/(auth)/welcome");
};

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        appReady,
        preloadedConversations,
        setPreloadedConversations,
        preloadConversations,
        signIn,
        signUp,
        logOut,
        updateToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
