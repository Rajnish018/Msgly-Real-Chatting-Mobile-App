import AsyncStorage from "@react-native-async-storage/async-storage";
import nacl from "tweetnacl";
import { decodeUTF8, encodeBase64 } from "tweetnacl-util";

const getLockKey = (userId: string) => `chatLocks:${userId}`;
const getPasswordKey = (userId: string) => `chatLockPassword:${userId}`;

const hashPassword = async (password: string) =>
  encodeBase64(nacl.hash(decodeUTF8(password.trim())));

export const loadLockedConversationIds = async (userId: string) => {
  const raw = await AsyncStorage.getItem(getLockKey(userId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

export const isConversationLocked = async (userId: string, conversationId: string) => {
  const ids = await loadLockedConversationIds(userId);
  return ids.includes(String(conversationId));
};

export const setConversationLocked = async (
  userId: string,
  conversationId: string,
  locked: boolean
) => {
  const ids = await loadLockedConversationIds(userId);
  const nextIds = locked
    ? Array.from(new Set([...ids, String(conversationId)]))
    : ids.filter((id) => id !== String(conversationId));

  await AsyncStorage.setItem(getLockKey(userId), JSON.stringify(nextIds));
  return nextIds;
};

export const ensureChatLockPassword = async (userId: string, password: string) => {
  const trimmed = password.trim();
  if (trimmed.length < 4) {
    return { success: false, msg: "Use at least 4 characters for the chat lock password." };
  }

  const existingHash = await AsyncStorage.getItem(getPasswordKey(userId));
  const nextHash = await hashPassword(trimmed);

  if (existingHash && existingHash !== nextHash) {
    return { success: false, msg: "Incorrect chat lock password." };
  }

  if (!existingHash) {
    await AsyncStorage.setItem(getPasswordKey(userId), nextHash);
  }

  return { success: true };
};

export const verifyChatLockPassword = async (userId: string, password: string) => {
  const existingHash = await AsyncStorage.getItem(getPasswordKey(userId));
  if (!existingHash) {
    return { success: false, msg: "Set a chat lock password from a profile first." };
  }

  const nextHash = await hashPassword(password);
  return existingHash === nextHash
    ? { success: true }
    : { success: false, msg: "Incorrect chat lock password." };
};
