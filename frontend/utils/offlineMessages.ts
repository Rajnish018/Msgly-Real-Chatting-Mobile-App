import AsyncStorage from "@react-native-async-storage/async-storage";
import { MessageProps } from "@/types";

const getOfflineMessagesStorageKey = (userId: string) => `offlineMessages:${userId}`;

export type OfflineMessageRecord = {
  clientId: string;
  conversationId?: string | null;
  participants: string[];
  sender: MessageProps["sender"];
  content: string;
  attachment?: string | null;
  localAttachmentUri?: string | null;
  replyTo?: MessageProps["replyTo"] | null;
  replyToId?: string | null;
  createdAt: string;
  syncStatus: "pending" | "failed";
};

export const getParticipantSignature = (participantIds: string[] = []) =>
  participantIds
    .map((id) => String(id))
    .filter(Boolean)
    .sort()
    .join(":");

export const loadOfflineMessages = async (userId: string): Promise<OfflineMessageRecord[]> => {
  try {
    const rawValue = await AsyncStorage.getItem(getOfflineMessagesStorageKey(userId));
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    console.log("Failed to load offline messages:", error);
    return [];
  }
};

export const saveOfflineMessages = async (
  userId: string,
  messages: OfflineMessageRecord[]
) => {
  try {
    if (!messages.length) {
      await AsyncStorage.removeItem(getOfflineMessagesStorageKey(userId));
      return;
    }

    await AsyncStorage.setItem(
      getOfflineMessagesStorageKey(userId),
      JSON.stringify(messages)
    );
  } catch (error) {
    console.log("Failed to save offline messages:", error);
  }
};

export const upsertOfflineMessage = async (
  userId: string,
  message: OfflineMessageRecord
) => {
  const existingMessages = await loadOfflineMessages(userId);
  const nextMessages = [
    ...existingMessages.filter((item) => item.clientId !== message.clientId),
    message,
  ];

  await saveOfflineMessages(userId, nextMessages);
};

export const removeOfflineMessage = async (userId: string, clientId: string) => {
  const existingMessages = await loadOfflineMessages(userId);
  const nextMessages = existingMessages.filter((item) => item.clientId !== clientId);
  await saveOfflineMessages(userId, nextMessages);
};

export const removeOfflineMessagesForConversation = async (
  userId: string,
  conversationId?: string | null,
  participantIds: string[] = []
) => {
  const existingMessages = await loadOfflineMessages(userId);
  const nextMessages = existingMessages.filter(
    (item) => !isOfflineMessageForConversation(item, conversationId, participantIds)
  );
  await saveOfflineMessages(userId, nextMessages);
};

export const updateOfflineMessage = async (
  userId: string,
  clientId: string,
  patch: Partial<OfflineMessageRecord>
) => {
  const existingMessages = await loadOfflineMessages(userId);
  const nextMessages = existingMessages.map((item) =>
    item.clientId === clientId ? { ...item, ...patch } : item
  );

  await saveOfflineMessages(userId, nextMessages);
};

export const isOfflineMessageForConversation = (
  message: OfflineMessageRecord,
  conversationId?: string | null,
  participantIds: string[] = []
) => {
  if (conversationId && String(message.conversationId) === String(conversationId)) {
    return true;
  }

  const currentConversationSignature = getParticipantSignature(participantIds);
  if (!currentConversationSignature) {
    return false;
  }

  return getParticipantSignature(message.participants) === currentConversationSignature;
};

export const mapOfflineRecordToMessage = (
  message: OfflineMessageRecord
): MessageProps => ({
  id: message.clientId,
  clientId: message.clientId,
  conversationId: message.conversationId || undefined,
  sender: message.sender,
  content: message.content,
  attachment: message.localAttachmentUri || message.attachment || null,
  localAttachmentUri: message.localAttachmentUri || null,
  createdAt: message.createdAt,
  syncStatus: message.syncStatus,
  deliveredTo: [message.sender.id],
  seenBy: [message.sender.id],
  replyTo: message.replyTo || null,
});
