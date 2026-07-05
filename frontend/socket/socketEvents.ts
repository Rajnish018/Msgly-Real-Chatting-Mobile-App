import { getSocket } from "./socket";

const withSocket = (event: string, payload: any, off = false) => {
  const socket = getSocket();

  if (!socket) {
    console.log(`Socket is not connected for ${event}`);
    return;
  }

  if (off) {
    socket.off(event, payload);
    return;
  }

  if (typeof payload === "function") {
    socket.on(event, payload);
    return;
  }

  socket.emit(event, payload);
};

export const testSocket = (payload: any, off = false) =>
  withSocket("testSocket", payload, off);

export const updateProfile = (payload: any, off = false) =>
  withSocket("updateProfile", payload, off);

export const updateProfileResponse = (payload: any, off = false) =>
  withSocket("updateProfileResponse", payload, off);

export const getContacts = (payload: any, off = false) =>
  withSocket("getContacts", payload, off);

export const newConversation = (payload: any, off = false) =>
  withSocket("newConversation", payload, off);

export const getConversations = (payload: any, off = false) =>
  withSocket("getConversations", payload, off);

export const newMessage = (payload: any, off = false) =>
  withSocket("newMessage", payload, off);

export const editMessage = (payload: any, off = false) =>
  withSocket("editMessage", payload, off);

export const deleteMessage = (payload: any, off = false) =>
  withSocket("deleteMessage", payload, off);

export const messageEdited = (payload: any, off = false) =>
  withSocket("messageEdited", payload, off);

export const messageDeleted = (payload: any, off = false) =>
  withSocket("messageDeleted", payload, off);

export const messageStatusUpdated = (payload: any, off = false) =>
  withSocket("messageStatusUpdated", payload, off);

export const getMessages = (payload: any, off = false) =>
  withSocket("getMessages", payload, off);

export const markConversationSeen = (payload: any, off = false) =>
  withSocket("markConversationSeen", payload, off);

export const getPreferences = (payload: any, off = false) =>
  withSocket("getPreferences", payload, off);

export const updatePreferences = (payload: any, off = false) =>
  withSocket("updatePreferences", payload, off);

export const joinConversation = (payload: any) =>
  withSocket("joinConversation", payload);

export const conversationUpdated = (payload: any, off = false) =>
  withSocket("conversationUpdated", payload, off);

export const typing = (payload: any) => withSocket("typing", payload);

export const stopTyping = (payload: any) => withSocket("stopTyping", payload);

export const typingListener = (payload: any, off = false) =>
  withSocket("typing", payload, off);

export const stopTypingListener = (payload: any, off = false) =>
  withSocket("stopTyping", payload, off);

export const conversationTyping = (payload: any, off = false) =>
  withSocket("conversationTyping", payload, off);

export const conversationStopTyping = (payload: any, off = false) =>
  withSocket("conversationStopTyping", payload, off);

export const clearChat = (payload: any, off = false) =>
  withSocket("clearChat", payload, off);

export const chatCleared = (payload: any, off = false) =>
  withSocket("chatCleared", payload, off);

export const messagesExpired = (payload: any, off = false) =>
  withSocket("messagesExpired", payload, off);

export const presenceUpdated = (payload: any, off = false) =>
  withSocket("presenceUpdated", payload, off);
