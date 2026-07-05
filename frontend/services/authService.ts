import { API_URL } from "@/constants";
import type { AppUserSettings } from "@/types";
import axios from "axios";
import { Alert } from "react-native";

// Configure Global Axios Interceptor for 403 USER_BLOCKED Boundary
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error?.response?.status === 403 &&
      error?.response?.data?.code === "USER_BLOCKED"
    ) {
      Alert.alert(
        "Access Denied",
        "You cannot access this profile because of a blocking status restriction.",
        [{ text: "OK" }]
      );
    }
    return Promise.reject(error);
  }
);

const getAuthConfig = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export const login = async (
  email: string,
  password: string
): Promise<{ token: string; user: any }> => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });
    // console.log("authservice", response.data)
    return response.data;

  } catch (error: any) {
    console.log("got error:", error);
    const msg = error?.response?.data?.msg || "Login failed";
    throw new Error(msg);
  }
};


export const register = async (
  email: string,
  password: string,
  name: string,
  avatar?: string | null,
  publicEncryptionKey?: string,
  encryptedPrivateKeyBackup?: { ciphertext: string; nonce: string }
): Promise<{ token: string; user: any }> => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      email,
      password,
      name,
      avatar,
      publicEncryptionKey,
      encryptedPrivateKeyBackup,
    });
    // console.log("authservice", response.data)
    return response.data;
  } catch (error: any) {
    console.log("got error:", error);
    const msg = error?.response?.data?.msg || "Registration failed";
    throw new Error(msg);
  }
};

export const getPrivacySettings = async (token: string) => {
  const response = await axios.get(`${API_URL}/auth/privacy`, getAuthConfig(token));
  // console.log("Privacy settings response:", response.data);
  return response.data;
};

export const updatePrivacySettings = async (
  token: string,
  payload: Record<string, any>
) => {
  const response = await axios.put(
    `${API_URL}/auth/privacy`,
    payload,
    getAuthConfig(token)
  );
  return response.data;
};

export const changePassword = async (
  token: string,
  payload: { currentPassword: string; newPassword: string }
) => {
  const response = await axios.post(
    `${API_URL}/auth/change-password`,
    payload,
    getAuthConfig(token)
  );
  return response.data;
};

export const exportMyData = async (token: string) => {
  const response = await axios.get(`${API_URL}/auth/export-data`, getAuthConfig(token));
  return response.data;
};

export const deleteMyAccount = async (token: string) => {
  const response = await axios.delete(`${API_URL}/auth/delete-account`, getAuthConfig(token));
  return response.data;
};

export const getUserSettings = async (token: string) => {
  const response = await axios.get(`${API_URL}/auth/settings`, getAuthConfig(token));
  return response.data;
};

export const updateUserSettings = async (
  token: string,
  payload: {
    language?: "en" | "hi" | "es";
    notificationsEnabled?: boolean;
    mutedConversationIds?: string[];
    settings?: any;
  }
) => {
  const response = await axios.put(`${API_URL}/auth/settings`, payload, getAuthConfig(token));
  return response.data;
};

export const updateEncryptionKey = async (
  token: string,
  publicEncryptionKey: string,
  encryptedPrivateKeyBackup?: { ciphertext: string; nonce: string } | null
) => {
  const response = await axios.post(
    `${API_URL}/auth/encryption-key`,
    { publicEncryptionKey, encryptedPrivateKeyBackup },
    getAuthConfig(token)
  );
  return response.data;
};

export const changeEmailAddress = async (
  token: string,
  payload: { newEmail: string; currentPassword: string }
) => {
  const response = await axios.put(
    `${API_URL}/auth/change-email`,
    payload,
    getAuthConfig(token)
  );
  return response.data;
};

export const updateTwoStepVerification = async (
  token: string,
  payload: {
    enabled: boolean;
    pin?: string;
    hint?: string;
    emailRecovery?: boolean;
    currentPassword: string;
  }
) => {
  const response = await axios.put(
    `${API_URL}/auth/two-step-verification`,
    payload,
    getAuthConfig(token)
  );
  return response.data;
};

export const getUserProfile = async (token: string, userId: string) => {
  const response = await axios.get(
    `${API_URL}/conversations/users/${userId}/profile`,
    getAuthConfig(token)
  );
  // console.log("Fetched user profile data:", response.data);
  return response.data;
};

export const clearChat = async (
  token: string,
  conversationId: string,
  payload: { scope?: "me" | "everyone" }
) => {
  const response = await axios.post(
    `${API_URL}/conversations/${conversationId}/clear`,
    payload,
    getAuthConfig(token)
  );
  return response.data;
};

export const getSharedContent = async (token: string, conversationId: string) => {
  const response = await axios.get(
    `${API_URL}/conversations/${conversationId}/shared-content`,
    getAuthConfig(token)
  );
  return response.data;
};

export const reportUser = async (
  token: string,
  targetUserId: string,
  payload: { reason: string; additionalDetails?: string }
) => {
  try {
    const response = await axios.post(
      `${API_URL}/report/${targetUserId}`,
      payload,
      getAuthConfig(token)
    );
    return response.data;
  } catch (error: any) {
    return error?.response?.data || { success: false, msg: "Network error occurred." };
  }
};


export const blockUser = async (token: string, targetUserId: string) => {
  // console.log(`Attempting to block user with ID: ${targetUserId}`);
  try {
    const response = await axios.post(
      `${API_URL}/auth/block/${targetUserId}`,
      {}, // <--- CRUCIAL FIX: Empty body goes here
      getAuthConfig(token) // <--- Config headers must be the 3rd parameter
    );
    // console.log(`Block user response for targetUserId ${targetUserId}:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error(`Axios blockUser error for ${targetUserId}:`, error);
    return error?.response?.data || { success: false, msg: "Network error occurred." };
  }
};
