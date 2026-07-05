import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import { KeyboardStickyView, useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, { FadeIn, FadeOut, useAnimatedStyle } from "react-native-reanimated";
import { Image } from "expo-image";
import moment from "moment";
import Avatar from "@/components/Avatar";
import BackButton from "@/components/BackButton";
import Header from "@/components/Header";
import Input from "@/components/Input";
import Loading from "@/components/Loading";
import MessageItem from "@/components/MessageItem";
import TypingDots from "@/components/TypingDots";
import Typo from "@/components/Typo";
import { CHAT_WALLPAPER_PRESETS, createDefaultUserSettings } from "@/constants/userSettings";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { useAuth } from "@/context/authContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { useCustomAlert } from "@/context/customAlertContext";
import { useTheme } from "@/context/themeContext";
import { blockUser as blockUserApi, clearChat as clearChatApi } from "@/services/authService";
import { uploadFileToCloudinary } from "@/services/imageService";
import { getSocket, isSocketConnected, onSocketEvent } from "@/socket/socket";
import {
  chatCleared,
  deleteMessage,
  editMessage,
  getMessages,
  joinConversation,
  markConversationSeen,
  messageDeleted,
  messageEdited,
  messageStatusUpdated,
  messagesExpired,
  newMessage,
  stopTyping,
  stopTypingListener,
  typing,
  typingListener,
} from "@/socket/socketEvents";
import { MessageProps, ResponseProps } from "@/types";
import { playSendSound, playDoubleTickSound } from "@/utils/soundHelper";
import {
  OfflineMessageRecord,
  getParticipantSignature,
  isOfflineMessageForConversation,
  loadOfflineMessages,
  mapOfflineRecordToMessage,
  removeOfflineMessage,
  removeOfflineMessagesForConversation,
  updateOfflineMessage,
  upsertOfflineMessage,
} from "@/utils/offlineMessages";
import {
  buildEncryptedPayloads,
  buildE2EEncryptedPayloads,
  decryptMessageForUser,
  decryptMessageE2EForUser,
  decryptMessagesForUser,
  getOrCreateEncryptionIdentity,
} from "@/utils/messageEncryption";
import { scale, verticalScale } from "@/utils/styling";

const TYPING_DEBOUNCE_MS = 800;
const EDIT_WINDOW_MS = 3 * 60 * 1000;

const createClientMessageId = (userId: string) =>
  `local-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sortMessagesByNewest = (items: MessageProps[]) =>
  [...items].sort(
    (first, second) =>
      new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime()
  );

const mergeMessages = (
  serverMessages: MessageProps[],
  localMessages: MessageProps[] = []
) => {
  const messageMap = new Map<string, MessageProps>();

  serverMessages.forEach((item) => {
    if (item.clientId) {
      messageMap.set(`client:${item.clientId}`, item);
    }
    messageMap.set(`id:${item.id}`, item);
  });

  localMessages.forEach((item) => {
    const clientKey = item.clientId ? `client:${item.clientId}` : "";
    if (clientKey && messageMap.has(clientKey)) {
      return;
    }

    if (messageMap.has(`id:${item.id}`)) {
      return;
    }

    if (clientKey) {
      messageMap.set(clientKey, item);
    }
    messageMap.set(`id:${item.id}`, item);
  });

  return sortMessagesByNewest(
    Array.from(new Set(Array.from(messageMap.values())))
  );
};

const Conversation = () => {
  const { user: currentUser, token, setPreloadedConversations, updateToken } = useAuth();
  const { colors, isDark } = useTheme();
  const { t, settings, toggleConversationMute, isConversationMuted } = useAppSettings();
  const { showAlert } = useCustomAlert();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { height } = useReanimatedKeyboardAnimation();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyingToRef = useRef<MessageProps | null>(null);
  const editingMessageRef = useRef<MessageProps | null>(null);
  const sendingClientIdsRef = useRef<Set<string>>(new Set());
  const playedDoubleTickRef = useRef<Set<string>>(new Set());

  const [conversationId, setConversationId] = useState<any>(params.id);
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageProps | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageProps | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [socketConnected, setSocketConnected] = useState(isSocketConnected());

  const MENU_TOP_OFFSET = insets.top + verticalScale(54);
  const name = params.name;
  const avatar = params.avatar;
  const type = params.type;
  const stringifiedParticipants = params.stringifiedParticipants || params.participants;

  const participants = useMemo(() => {
    try {
      return stringifiedParticipants ? JSON.parse(stringifiedParticipants as string) : [];
    } catch {
      return [];
    }
  }, [stringifiedParticipants]);

  const isDirect = type === "direct";
  const otherParticipant = isDirect
    ? participants.find((participant: any) => participant?._id !== currentUser?.id)
    : null;

  const conversationAvatar = isDirect ? otherParticipant?.avatar : avatar;
  const conversationName = isDirect ? otherParticipant?.name : name;
  const conversationMuted = isConversationMuted(conversationId as string);
  const blockedUserIds = currentUser?.settings?.privacy?.blockedUserIds || currentUser?.blockedUsers || [];
  const isBlockedByMe =
    isDirect &&
    !!otherParticipant?._id &&
    blockedUserIds.map(String).includes(String(otherParticipant._id));

  const chatSettings = settings?.chats || createDefaultUserSettings().chats;
  const wallpaper = CHAT_WALLPAPER_PRESETS[chatSettings.wallpaperPreset];
  const customWallpaperUrl = chatSettings.customWallpaperUrl || null;
  const conversationParticipantIds = useMemo(() => {
    const ids = participants
      .map((participant: any) => participant?._id)
      .filter(Boolean)
      .map((id: string) => String(id));

    if (currentUser?.id && !ids.includes(String(currentUser.id))) {
      ids.push(String(currentUser.id));
    }

    if (!ids.length && currentUser?.id && otherParticipant?._id) {
      return [String(currentUser.id), String(otherParticipant._id)];
    }

    return ids;
  }, [participants, currentUser?.id, otherParticipant?._id]);
  const participantSignature = useMemo(
    () => getParticipantSignature(conversationParticipantIds),
    [conversationParticipantIds]
  );

  useEffect(() => {
    if (currentUser?.id) {
      getOrCreateEncryptionIdentity(
        String(currentUser.id),
        token,
        currentUser.publicEncryptionKey
      )
        .then((identity) => {
          if (identity?.token) {
            return updateToken(identity.token);
          }
        })
        .catch((error) => console.log("encryption identity setup failed:", error));
    }
  }, [currentUser?.id, currentUser?.publicEncryptionKey, token, updateToken]);

  useEffect(() => {
    replyingToRef.current = replyingTo;
  }, [replyingTo]);

  useEffect(() => {
    editingMessageRef.current = editingMessage;
  }, [editingMessage]);

  useEffect(() => {
    let isMounted = true;

    const loadLocalPendingMessages = async () => {
      if (!currentUser?.id) return;

      const storedMessages = await loadOfflineMessages(currentUser.id);
      const pendingMessages = storedMessages
        .filter((item) =>
          isOfflineMessageForConversation(
            item,
            conversationId ? String(conversationId) : undefined,
            conversationParticipantIds
          )
        )
        .map(mapOfflineRecordToMessage);

      if (!isMounted || !pendingMessages.length) return;

      setMessages((prev) => mergeMessages(prev, pendingMessages));
    };

    void loadLocalPendingMessages();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, conversationId, participantSignature]);

  useEffect(() => {
    newMessage(newMessageHandler);
    getMessages(getMessageHandler);
    messageEdited(messageEditedHandler);
    messageDeleted(messageDeletedHandler);
    messageStatusUpdated(messageStatusUpdatedHandler);
    editMessage(editMessageAckHandler);
    deleteMessage(deleteMessageAckHandler);
    typingListener(typingHandler);
    stopTypingListener(stopTypingHandler);
    chatCleared(chatClearedHandler);
    messagesExpired(messagesExpiredHandler);

    if (conversationId) {
      joinConversation(String(conversationId));
      getMessages({ conversationId });
    } else if (isDirect && otherParticipant?._id) {
      getMessages({
        participants: [currentUser?.id, otherParticipant._id],
      });
    }

    return () => {
      newMessage(newMessageHandler, true);
      getMessages(getMessageHandler, true);
      messageEdited(messageEditedHandler, true);
      messageDeleted(messageDeletedHandler, true);
      messageStatusUpdated(messageStatusUpdatedHandler, true);
      editMessage(editMessageAckHandler, true);
      deleteMessage(deleteMessageAckHandler, true);
      typingListener(typingHandler, true);
      stopTypingListener(stopTypingHandler, true);
      chatCleared(chatClearedHandler, true);
      messagesExpired(messagesExpiredHandler, true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, otherParticipant?._id]);

  const updateConversationPreview = useCallback((updater: (prev: any[]) => any[]) => {
    setPreloadedConversations((prev) => updater(prev));
  }, [setPreloadedConversations]);

  const syncConversationPreview = useCallback(
    (nextMessage: MessageProps, targetConversationId?: string | null) => {
      if (!targetConversationId) return;

      updateConversationPreview((prev) => {
        const existingIndex = prev.findIndex(
          (conversation) => String(conversation._id) === String(targetConversationId)
        );

        if (existingIndex === -1) {
          return prev;
        }

        const nextConversations = [...prev];
        nextConversations[existingIndex] = {
          ...nextConversations[existingIndex],
          updatedAt: nextMessage.createdAt || new Date().toISOString(),
          lastMessage: {
            id: nextMessage.id,
            _id: nextMessage._id,
            clientId: nextMessage.clientId,
            conversationId: nextMessage.conversationId,
            sender: nextMessage.sender,
            content: nextMessage.content,
            attachment: nextMessage.attachment || nextMessage.localAttachmentUri || null,
            createdAt: nextMessage.createdAt,
            editedAt: nextMessage.editedAt,
            isDeleted: nextMessage.isDeleted,
            syncStatus: nextMessage.syncStatus,
          },
        };

        return nextConversations.sort(
          (first, second) =>
            new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
        );
      });
    },
    [updateConversationPreview]
  );

  const setLocalMessageStatus = useCallback(
    (clientId: string, syncStatus: MessageProps["syncStatus"]) => {
      setMessages((prev) =>
        prev.map((item) =>
          item.clientId === clientId || item.id === clientId
            ? { ...item, syncStatus }
            : item
        )
      );
    },
    []
  );

  const upsertMessageInState = useCallback(
    (nextMessage: MessageProps, clientId?: string) => {
      setMessages((prev) => {
        const existingIndex = prev.findIndex(
          (item) =>
            String(item.id) === String(nextMessage.id) ||
            (!!clientId &&
              (String(item.clientId) === String(clientId) ||
                String(item.id) === String(clientId)))
        );

        if (existingIndex === -1) {
          return mergeMessages([nextMessage], prev);
        }

        const nextItems = [...prev];
        nextItems[existingIndex] = nextMessage;
        return sortMessagesByNewest(nextItems);
      });
    },
    []
  );

  const queueOutgoingMessage = useCallback(async () => {
    if (!currentUser?.id) return null;

    const createdAt = new Date().toISOString();
    const clientId = createClientMessageId(String(currentUser.id));
    const offlineRecord: OfflineMessageRecord = {
      clientId,
      conversationId: conversationId ? String(conversationId) : undefined,
      participants: conversationParticipantIds,
      sender: {
        id: String(currentUser.id),
        name: currentUser.name,
        avatar: currentUser.avatar || null,
      },
      content: message.trim(),
      attachment: null,
      localAttachmentUri: selectedFile?.uri || null,
      replyTo: replyingTo || null,
      replyToId: replyingTo?.id || null,
      createdAt,
      syncStatus: "pending",
    };

    await upsertOfflineMessage(String(currentUser.id), offlineRecord);

    const localMessage = mapOfflineRecordToMessage(offlineRecord);
    setMessages((prev) => mergeMessages(prev, [localMessage]));
    syncConversationPreview(
      localMessage,
      conversationId ? String(conversationId) : undefined
    );

    return localMessage;
  }, [
    conversationId,
    conversationParticipantIds,
    currentUser,
    message,
    replyingTo,
    selectedFile,
    syncConversationPreview,
  ]);

  const flushPendingMessages = useCallback(async () => {
    if (!currentUser?.id) return;

    const socket = getSocket();
    if (!socket?.connected) return;

    const storedMessages = await loadOfflineMessages(String(currentUser.id));
    const matchingMessages = storedMessages
      .filter((item) =>
        isOfflineMessageForConversation(
          item,
          conversationId ? String(conversationId) : undefined,
          conversationParticipantIds
        )
      )
      .sort(
        (first, second) =>
          new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
      );

    for (const pendingMessage of matchingMessages) {
      if (sendingClientIdsRef.current.has(pendingMessage.clientId)) {
        continue;
      }

      sendingClientIdsRef.current.add(pendingMessage.clientId);
      setLocalMessageStatus(pendingMessage.clientId, "sending");

      try {
        let attachment = pendingMessage.attachment || null;

        if (!attachment && pendingMessage.localAttachmentUri) {
          const uploadResult = await uploadFileToCloudinary(
            { uri: pendingMessage.localAttachmentUri },
            "message-attachments"
          );

          if (!uploadResult.success) {
            throw new Error(uploadResult.msg || "Upload failed");
          }

          attachment = uploadResult.data;
        }

        const shouldEncryptText = isDirect && !attachment && pendingMessage.content.trim();

        // Use E2E encryption for better security
        const encryptedPayloads =
          shouldEncryptText && currentUser.publicEncryptionKey
            ? await buildE2EEncryptedPayloads({
              content: pendingMessage.content,
              conversationId: pendingMessage.conversationId || conversationId,
              currentUserId: String(currentUser.id),
              currentUserPublicKey: currentUser.publicEncryptionKey,
              participants,
            })
            : null;

        if (shouldEncryptText && !encryptedPayloads) {
          throw new Error("Encryption keys are not ready for this chat.");
        }

        newMessage({
          clientId: pendingMessage.clientId,
          conversationId: pendingMessage.conversationId || conversationId,
          participants:
            pendingMessage.conversationId || conversationId
              ? undefined
              : pendingMessage.participants,
          sender: pendingMessage.sender,
          content: encryptedPayloads ? "Encrypted message" : pendingMessage.content,
          attachment,
          encryptedPayloads,
          encryption: encryptedPayloads ? { scheme: "e2e-v1", version: 1 } : undefined,
          replyTo: pendingMessage.replyToId,
        });
      } catch (error) {
        sendingClientIdsRef.current.delete(pendingMessage.clientId);
        await updateOfflineMessage(String(currentUser.id), pendingMessage.clientId, {
          syncStatus: "failed",
        });
        setLocalMessageStatus(pendingMessage.clientId, "failed");
      }
    }
  }, [
    conversationId,
    conversationParticipantIds,
    currentUser?.publicEncryptionKey,
    currentUser?.id,
    isDirect,
    participants,
    setLocalMessageStatus,
    token,
  ]);

  useEffect(() => {
    setSocketConnected(isSocketConnected());

    const offConnect = onSocketEvent("connect", () => {
      setSocketConnected(true);
    });
    const offDisconnect = onSocketEvent("disconnect", () => {
      setSocketConnected(false);
    });
    const offConnectError = onSocketEvent("connect_error", () => {
      setSocketConnected(false);
    });

    return () => {
      offConnect();
      offDisconnect();
      offConnectError();
    };
  }, []);

  useEffect(() => {
    if (!socketConnected) return;
    void flushPendingMessages();
  }, [flushPendingMessages, socketConnected]);

  const newMessageHandler = async (res: ResponseProps) => {
    setLoading(false);

    const ackClientId = res.data?.clientId;

    if (!res.success || !res.data) {
      if (ackClientId && currentUser?.id) {
        sendingClientIdsRef.current.delete(ackClientId);
        await updateOfflineMessage(String(currentUser.id), ackClientId, {
          syncStatus: "failed",
        });
        setLocalMessageStatus(ackClientId, "failed");
      }

      if (res.msg) {
        showAlert({
          title: t("conversation"),
          message: res.msg,
          variant: "danger",
        });
      }
      return;
    }

    // Use E2E decryption which handles both E2E and legacy encrypted messages
    const incomingMessage = await decryptMessageE2EForUser({
      ...(res.data as MessageProps),
      syncStatus: "sent" as const,
    }, currentUser?.id);
    const activeConversationId = String(
      incomingMessage.conversationId || conversationId || res.data.conversationId
    );

    if (incomingMessage.clientId && currentUser?.id) {
      sendingClientIdsRef.current.delete(incomingMessage.clientId);
      await removeOfflineMessage(String(currentUser.id), incomingMessage.clientId);
      
      const isOutgoing = String(incomingMessage.sender?.id) === String(currentUser?.id);
      if (isOutgoing) {
        void playSendSound();
      }
    }

    if (!conversationId) {
      setConversationId(activeConversationId);
      joinConversation(activeConversationId);
    }

    if (
      !conversationId ||
      String(incomingMessage.conversationId) ===
      String(conversationId || incomingMessage.conversationId)
    ) {
      upsertMessageInState(incomingMessage, incomingMessage.clientId);
    }

    syncConversationPreview(incomingMessage, activeConversationId);

    if (String(incomingMessage.sender?.id) !== String(currentUser?.id)) {
      markConversationSeen({
        conversationId: activeConversationId,
        messageIds: [incomingMessage.id],
      });
    }

    setIsOtherUserTyping(false);
  };

  const getMessageHandler = async (res: ResponseProps) => {
    if (!res.success || !currentUser?.id) {
      return;
    }

    const nextMessages = await decryptMessagesForUser((res.data || []) as MessageProps[], currentUser.id);
    const storedMessages = await loadOfflineMessages(String(currentUser.id));
    const pendingMessages = storedMessages
      .filter((item) =>
        isOfflineMessageForConversation(
          item,
          conversationId ? String(conversationId) : undefined,
          conversationParticipantIds
        )
      )
      .map(mapOfflineRecordToMessage);

    setMessages(mergeMessages(nextMessages, pendingMessages));

    const nextConversationId = nextMessages?.[0]?.conversationId || conversationId;
    if (nextConversationId) {
      setConversationId(nextConversationId);
      joinConversation(String(nextConversationId));
      const unseenIds = nextMessages
        .filter(
          (item) =>
            String(item.sender?.id) !== String(currentUser?.id) &&
            !item.seenBy?.includes(String(currentUser?.id))
        )
        .map((item) => item.id);

      if (unseenIds.length) {
        markConversationSeen({
          conversationId: String(nextConversationId),
          messageIds: unseenIds,
        });
      }
    }
  };

  const replaceMessage = (nextMessage: MessageProps) => {
    upsertMessageInState(nextMessage, nextMessage.clientId);
  };

  const messageEditedHandler = (res: ResponseProps) => {
    if (res.success && res.data) {
      const nextMessage = {
        ...(res.data as MessageProps),
        syncStatus: "sent" as const,
      };
      replaceMessage(nextMessage);
      syncConversationPreview(nextMessage, nextMessage.conversationId);
    }
  };

  const messageDeletedHandler = (res: ResponseProps) => {
    if (res.success && res.data) {
      const deletedMessage = res.data as MessageProps;
      setMessages((prev) =>
        prev.map((item) => {
          if (String(item.id) === String(deletedMessage.id)) {
            return deletedMessage;
          }

          if (String(item.replyTo?.id) === String(deletedMessage.id)) {
            return {
              ...item,
              replyTo: null,
            };
          }

          return item;
        })
      );

      if (String(replyingToRef.current?.id) === String(deletedMessage.id)) {
        setReplyingTo(null);
      }

      if (String(editingMessageRef.current?.id) === String(deletedMessage.id)) {
        setEditingMessage(null);
        setMessage("");
      }
    }
  };

  const messageStatusUpdatedHandler = (res: ResponseProps) => {
    if (res.success && res.data) {
      const updatedMessage = res.data as MessageProps;
      const isOutgoing = String(updatedMessage.sender?.id) === String(currentUser?.id);

      if (isOutgoing && updatedMessage.id) {
        const wasSeen = (updatedMessage as any).seenBy?.length > 1;
        const wasDelivered = (updatedMessage as any).deliveredTo?.length > 1;
        const msgId = String(updatedMessage.id);

        if ((wasSeen || wasDelivered) && !playedDoubleTickRef.current.has(msgId)) {
          playedDoubleTickRef.current.add(msgId);
          void playDoubleTickSound();
        }
      }

      replaceMessage(updatedMessage);
    }
  };

  const messagesExpiredHandler = (res: ResponseProps) => {
    if (!res.success || !res.data) return;
    if (String(res.data.conversationId) !== String(conversationId)) return;

    const expiredIds = new Set((res.data.messageIds || []).map((id: string) => String(id)));

    setMessages((prev) =>
      prev
        .filter((item) => !expiredIds.has(String(item.id)))
        .map((item) =>
          expiredIds.has(String(item.replyTo?.id))
            ? { ...item, replyTo: null }
            : item
        )
    );

    if (replyingToRef.current && expiredIds.has(String(replyingToRef.current.id))) {
      setReplyingTo(null);
    }

    if (editingMessageRef.current && expiredIds.has(String(editingMessageRef.current.id))) {
      setEditingMessage(null);
      setMessage("");
    }
  };

  const editMessageAckHandler = (res: ResponseProps) => {
    setLoading(false);
    if (!res.success && res.msg) {
      showAlert({
        title: t("edit"),
        message: res.msg,
        variant: "warning",
      });
      return;
    }

    setMessage("");
    setEditingMessage(null);
    setReplyingTo(null);
  };

  const deleteMessageAckHandler = (res: ResponseProps) => {
    if (!res.success && res.msg) {
      showAlert({
        title: t("delete"),
        message: res.msg,
        variant: "danger",
      });
    }
  };

  const typingHandler = (res: ResponseProps) => {
    if (!res.success || !res.data) return;
    if (String(res.data.conversationId) !== String(conversationId)) return;
    if (String(res.data.senderId) === String(currentUser?.id)) return;
    setIsOtherUserTyping(true);
  };

  const stopTypingHandler = (res: ResponseProps) => {
    if (!res.success || !res.data) return;
    if (String(res.data.conversationId) !== String(conversationId)) return;
    if (String(res.data.senderId) === String(currentUser?.id)) return;
    setIsOtherUserTyping(false);
  };

  function clearComposerState() {
    setReplyingTo(null);
    setEditingMessage(null);
    setMessage("");
  }

  const chatClearedHandler = async (res: ResponseProps) => {
    if (!res.success || !res.data) return;
    if (String(res.data.conversationId) !== String(conversationId)) return;
    if (currentUser?.id) {
      await removeOfflineMessagesForConversation(
        String(currentUser.id),
        String(conversationId),
        conversationParticipantIds
      );
    }
    setMessages([]);
    setSelectedFile(null);
    clearComposerState();
  };

  const navigateToProfile = () => {
    setShowMenu(false);
    if (isDirect && otherParticipant) {
      router.push({
        pathname: "/(main)/profile",
        params: {
          id: otherParticipant._id,
          name: otherParticipant.name,
          avatar: otherParticipant.avatar,
          conversationId: conversationId,
        },
      });
    }
  };

  const emitTypingState = (isTyping: boolean) => {
    if (!conversationId || !currentUser?.id) return;

    if (isTyping) {
      typing({
        conversationId,
        senderId: currentUser.id,
      });
      return;
    }

    stopTyping({
      conversationId,
      senderId: currentUser.id,
    });
  };

  const handleComposerChange = (value: string) => {
    setMessage(value);

    if (conversationId && value.trim()) {
      emitTypingState(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        emitTypingState(false);
      }, TYPING_DEBOUNCE_MS);
    } else if (conversationId) {
      emitTypingState(false);
    }
  };

  const onSend = async () => {
    if (!message.trim() && !selectedFile) return;
    if (!currentUser) return;

    if (isBlockedByMe) {
      triggerBlockedAlert();
      return;
    }

    if (isDirect && !selectedFile && message.trim() && !otherParticipant?.publicEncryptionKey) {
      showAlert({
        title: "Encryption not ready",
        message: `${conversationName || "This user"} needs to open the app once before encrypted messages can be delivered.`,
        variant: "warning",
      });
      return;
    }

    try {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      emitTypingState(false);

      if (editingMessage) {
        if (!socketConnected) {
          showAlert({
            title: t("edit"),
            message: t("internetRequired") || "Reconnect to the internet to edit this message.",
            variant: "warning",
          });
          return;
        }

        setLoading(true);

        if (!canEditMessage(editingMessage)) {
          setLoading(false);
          showAlert({
            title: t("edit"),
            message:
              t("editWindowExpired") || "You can only edit a message within 3 minutes of sending it.",
            variant: "warning",
          });
          setEditingMessage(null);
          return;
        }

        editMessage({
          messageId: editingMessage.id,
          content: message.trim(),
        });
        return;
      }

      if (!conversationId && isDirect && conversationParticipantIds.length < 2) {
        showAlert({
          title: t("conversation"),
          message: t("failedToSendMessage") || "Unable to queue this message right now.",
          variant: "danger",
        });
        return;
      }

      await queueOutgoingMessage();

      setMessage("");
      setSelectedFile(null);
      setReplyingTo(null);

      if (socketConnected) {
        void flushPendingMessages();
      }
    } catch (error) {
      setLoading(false);
      showAlert({
        title: t("conversation"),
        message: editingMessage
          ? t("failedToEditMessage")
          : t("failedToSendMessage") || "Failed to queue message.",
        variant: "danger",
      });
    }
  };

  const onPickFile = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    } as any);

    if (!result.canceled) {
      setSelectedFile(result.assets[0]);
    }
  };

  const messagesAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: height.value }],
  }));

  const canEditMessage = (item: MessageProps) =>
    !item.isDeleted &&
    !!item.content?.trim() &&
    Date.now() - new Date(item.createdAt).getTime() <= EDIT_WINDOW_MS;

  const handleMessagePress = (item: MessageProps) => {
    startReply(item);
  };

  const startReply = (item: MessageProps) => {
    if (item.syncStatus && item.syncStatus !== "sent") {
      showAlert({
        title: t("reply"),
        message:
          t("messageStillSending") ||
          "Wait for this message to sync before replying to it.",
        variant: "info",
        buttons: [{ text: t("cancel"), style: "cancel" }],
      });
      return;
    }

    if (item.isDeleted) {
      showAlert({
        title: t("reply"),
        message: t("messageDeleted"),
        variant: "warning",
        buttons: [{ text: t("cancel"), style: "cancel" }],
      });
      return;
    }

    setReplyingTo(item);
    setEditingMessage(null);
  };

  const startEditing = (item: MessageProps) => {
    if (item.syncStatus && item.syncStatus !== "sent") {
      showAlert({
        title: t("edit"),
        message:
          t("internetRequired") ||
          "Reconnect to the internet and let this message sync before editing it.",
        variant: "warning",
        buttons: [{ text: t("cancel"), style: "cancel" }],
      });
      return;
    }

    if (!canEditMessage(item)) {
      showAlert({
        title: t("edit"),
        message:
          t("editWindowExpired") || "You can only edit a message within 3 minutes of sending it.",
        variant: "warning",
        buttons: [{ text: t("cancel"), style: "cancel" }],
      });
      return;
    }

    setEditingMessage(item);
    setReplyingTo(null);
    setMessage(item.content || "");
    setSelectedFile(null);
  };

  const confirmDeleteMessage = (item: MessageProps) => {
    if (item.syncStatus && item.syncStatus !== "sent") {
      showAlert({
        title: t("delete"),
        message:
          t("messageStillSending") ||
          "Wait for this message to sync before deleting it.",
        variant: "warning",
        buttons: [{ text: t("cancel"), style: "cancel" }],
      });
      return;
    }

    showAlert({
      title: t("delete"),
      message:
        t("deleteMessageConfirm") ||
        "Delete this message for everyone? This action cannot be undone.",
      variant: "danger",
      buttons: [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => deleteMessage({ messageId: item.id }),
        },
      ],
      dismissible: false,
    });
  };

  const handleMessageLongPress = (item: MessageProps) => {
    const isMine = String(currentUser?.id) === String(item.sender?.id);

    if (item.isDeleted) {
      showAlert({
        title: t("conversation"),
        message: t("messageDeleted"),
        variant: "info",
        buttons: [{ text: t("cancel"), style: "cancel" }],
      });
      return;
    }

    if (isMine && item.syncStatus && item.syncStatus !== "sent") {
      showAlert({
        title: t("conversation"),
        message:
          item.syncStatus === "failed"
            ? t("failedToSendMessage") || "This message will send when the internet is back."
            : t("messageStillSending") || "This message is waiting to sync.",
        variant: item.syncStatus === "failed" ? "warning" : "info",
        buttons: [{ text: t("cancel"), style: "cancel" }],
      });
      return;
    }

    const buttons: { text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }[] = [
      {
        text: t("reply"),
        onPress: () => startReply(item),
      },
    ];

    if (isMine && canEditMessage(item)) {
      buttons.push({
        text: t("edit"),
        onPress: () => startEditing(item),
      });
    }

    if (isMine) {
      buttons.push({
        text: t("delete"),
        style: "destructive",
        onPress: () => confirmDeleteMessage(item),
      });
    }

    buttons.push({ text: t("cancel"), style: "cancel" });

    showAlert({
      title: t("messageActions") || t("conversation"),
      message:
        t("chooseMessageAction") ||
        "Choose what you want to do with this message.",
      variant: "info",
      buttons,
    });
  };

  const handleClearChat = () => {
    if (!conversationId || !token) return;

    showAlert({
      title: t("clearChat"),
      message:
        "Choose how you want to clear this conversation. Clearing for everyone removes visible messages for all participants.",
      variant: "warning",
      buttons: [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("clearChatForMe") || `${t("clearChat")} (${t("messages")})`,
          onPress: async () => {
            const response = await clearChatApi(token, String(conversationId), { scope: "me" });
            if (response?.success) {
              if (currentUser?.id) {
                await removeOfflineMessagesForConversation(
                  String(currentUser.id),
                  String(conversationId),
                  conversationParticipantIds
                );
              }
              setMessages([]);
              setSelectedFile(null);
              clearComposerState();
              updateConversationPreview((prev) =>
                prev.map((conversation) =>
                  String(conversation._id) === String(conversationId)
                    ? { ...conversation, lastMessage: undefined }
                    : conversation
                )
              );
              return;
            }

            showAlert({
              title: t("clearChat"),
              message: response?.msg || t("somethingWentWrong"),
              variant: "danger",
            });
          },
        },
        {
          text: t("clearChatForEveryone") || `${t("clearChat")} (All)`,
          style: "destructive",
          onPress: async () => {
            const response = await clearChatApi(token, String(conversationId), {
              scope: "everyone",
            });
            if (response?.success) {
              if (currentUser?.id) {
                await removeOfflineMessagesForConversation(
                  String(currentUser.id),
                  String(conversationId),
                  conversationParticipantIds
                );
              }
              setMessages([]);
              setSelectedFile(null);
              clearComposerState();
              return;
            }

            showAlert({
              title: t("clearChat"),
              message: response?.msg || t("somethingWentWrong"),
              variant: "danger",
            });
          },
        },
      ],
      dismissible: false,
    });
  };

  const handleUnblockUser = async () => {
    if (!token || !otherParticipant?._id) return;

    const response = await blockUserApi(token, String(otherParticipant._id));


    if (response?.success) {
      if (response.token) {
        await updateToken(response.token);
      }
      showAlert({
        title: "Unblocked",
        message: `${conversationName || "This user"} can send and receive messages with you again.`,
        variant: "success",
      });
      return;
    }

    showAlert({
      title: "Unblock failed",
      message: response?.msg || t("somethingWentWrong"),
      variant: "danger",
    });
  };

  const triggerBlockedAlert = () => {
    showAlert({
      title: "Unblock User",
      message: "You blocked this user. To send message you unblock",
      variant: "warning",
      buttons: [
        { text: "OK", style: "cancel" },
        {
          text: "Unblock",
          style: "default",
          onPress: handleUnblockUser,
        },
      ],
    });
  };

  const subtitle = useMemo(() => {
    if (!isDirect) return t("tapForInfo");
    if (isOtherUserTyping) return "Typing...";
    if (otherParticipant?.isOnline) return t("online");
    if (otherParticipant?.lastSeen) return moment(otherParticipant.lastSeen).fromNow();
    return t("tapForInfo");
  }, [isDirect, isOtherUserTyping, otherParticipant?.isOnline, otherParticipant?.lastSeen]);

  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <SafeAreaView
        edges={["top"]}
        style={[
          styles.headerSafeArea,
          { backgroundColor: colors.white, borderBottomColor: colors.neutral200 },
        ]}
      >
        <Header
          style={styles.header}
          leftIcon={
            <View style={styles.headerLeft}>
              <BackButton color={colors.black} />
              <TouchableOpacity activeOpacity={0.7} style={styles.headerInfo} onPress={navigateToProfile}>
                <Avatar size={scale(38)} uri={conversationAvatar as string} isGroup={type === "group"} />
                <View style={{ marginLeft: spacingX._3 }}>
                  <Typo color={colors.black} fontWeight={"700"} size={16}>
                    {conversationName || t("conversation")}
                  </Typo>
                  <Typo color={isOtherUserTyping ? colors.primary : colors.neutral500} size={12}>
                    {subtitle}
                  </Typo>
                </View>
              </TouchableOpacity>
            </View>
          }
          rightIcon={
            <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
              <Icons.DotsThreeVertical size={scale(24)} color={colors.black} weight="bold" />
            </TouchableOpacity>
          }
        />
      </SafeAreaView>

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={[
              styles.menuDropdown,
              {
                top: MENU_TOP_OFFSET,
                backgroundColor: colors.white,
                borderColor: colors.neutral200,
              },
            ]}
          >
            <TouchableOpacity style={styles.menuItem} onPress={navigateToProfile}>
              <Icons.User size={scale(20)} color={colors.neutral700} />
              <Typo size={15} color={colors.neutral700}>
                {t("viewProfile")}
              </Typo>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                setShowMenu(false);
                if (conversationId) {
                  await toggleConversationMute(String(conversationId));
                }
              }}
            >
              <Icons.BellSlash size={scale(20)} color={colors.neutral700} />
              <Typo size={15} color={colors.neutral700}>
                {conversationMuted ? t("unmuteNotifications") : t("muteNotifications")}
              </Typo>
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: colors.neutral200 }]} />

            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowMenu(false);
              handleClearChat();
            }}>
              <Icons.Trash size={scale(20)} color={colors.rose} />
              <Typo size={15} color={colors.rose}>
                {t("clearChat")}
              </Typo>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      <View style={styles.flex1}>
        <Animated.View
          style={[
            styles.content,
            messagesAnimatedStyle,
            { backgroundColor: customWallpaperUrl ? colors.neutral100 : wallpaper.backgroundColor },
          ]}
        >
          {customWallpaperUrl ? (
            <>
              <Image
                source={{ uri: customWallpaperUrl }}
                contentFit="cover"
                style={StyleSheet.absoluteFillObject}
              />
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFillObject,
                  {
                    backgroundColor: isDark
                      ? "rgba(12, 16, 24, 0.46)"
                      : "rgba(255, 255, 255, 0.32)",
                  },
                ]}
              />
            </>
          ) : (
            <>
              <View
                pointerEvents="none"
                style={[
                  styles.wallpaperOrb,
                  styles.wallpaperOrbTop,
                  { backgroundColor: wallpaper.accentColor, opacity: 0.16 },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.wallpaperOrb,
                  styles.wallpaperOrbBottom,
                  { backgroundColor: wallpaper.bubbleTint, opacity: 0.95 },
                ]}
              />
            </>
          )}
          <FlatList
            data={messages}
            inverted
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.messagesContent}
            ListHeaderComponent={
              <View style={{ gap: spacingY._10 }}>
                {isOtherUserTyping && (
                  <View
                    style={[
                      styles.typingBubble,
                      { backgroundColor: colors.otherBubble, borderColor: colors.neutral200 },
                    ]}
                  >
                    <TypingDots color={colors.primary} />
                  </View>
                )}

                {isBlockedByMe && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={triggerBlockedAlert}
                    style={[
                      styles.chatBlockedBanner,
                      { backgroundColor: colors.neutral100, borderColor: colors.neutral200 }
                    ]}
                  >
                    <Icons.Prohibit size={scale(16)} color={colors.rose} weight="bold" />
                    <Typo size={12} color={colors.neutral600} style={{ flex: 1, textAlign: "center" }}>
                      You blocked this user. To send message you unblock
                    </Typo>
                    <Typo size={12} color={colors.primary} fontWeight="700">
                      Unblock
                    </Typo>
                  </TouchableOpacity>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <MessageItem
                item={item}
                isDirect={isDirect}
                onLongPress={handleMessageLongPress}
                onReply={handleMessagePress}
              />
            )}
            keyExtractor={(item, index) => item?.id || index.toString()}
            onScrollBeginDrag={Keyboard.dismiss}
          />


        </Animated.View>


        <KeyboardStickyView
          offset={{ closed: 0, opened: 0 }}
          style={[styles.footerSticky, { backgroundColor: colors.white }]}
        >
          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom, spacingY._10),
                backgroundColor: colors.white,
                borderTopColor: colors.neutral100,
              },
            ]}
          >
            {(replyingTo || editingMessage) && (
              <View
                style={[
                  styles.actionBanner,
                  { backgroundColor: colors.neutral100, borderColor: colors.neutral200 },
                ]}
              >
                <View style={styles.actionBannerContent}>
                  <Typo size={12} fontWeight="700" color={colors.neutral700}>
                    {editingMessage
                      ? t("editingMessage")
                      : `${t("replyingTo")} ${replyingTo?.sender?.name || ""}`}
                  </Typo>
                  {!editingMessage && !!replyingTo && (
                    <Typo size={12} color={colors.neutral500} textProps={{ numberOfLines: 1 }}>
                      {replyingTo.isDeleted
                        ? t("messageDeleted")
                        : replyingTo.content || (replyingTo.attachment ? "📷 Image" : "")}
                    </Typo>
                  )}
                </View>
                <TouchableOpacity onPress={clearComposerState}>
                  <Icons.X size={18} color={colors.neutral600} />
                </TouchableOpacity>
              </View>
            )}



            {selectedFile && (
              <View style={styles.attachmentPreview}>
                <Image
                  source={{ uri: selectedFile.uri }}
                  style={[styles.previewImage, { borderColor: colors.neutral200 }]}
                />
                <TouchableOpacity
                  style={[styles.removeFile, { backgroundColor: colors.white }]}
                  onPress={() => setSelectedFile(null)}
                >
                  <Icons.XCircle size={20} color={colors.rose} weight="fill" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.footerInner}>
              {isBlockedByMe && (
                <TouchableOpacity
                  activeOpacity={1}
                  style={[StyleSheet.absoluteFillObject, { zIndex: 10 }]}
                  onPress={triggerBlockedAlert}
                />
              )}
              <TouchableOpacity
                style={[styles.plusButton, { backgroundColor: colors.neutral100 }]}
                onPress={onPickFile}
                disabled={isBlockedByMe}
              >
                <Icons.Plus size={scale(22)} color={colors.neutral600} weight="bold" />
              </TouchableOpacity>

              <Input
                value={message}
                onChangeText={handleComposerChange}
                containerStyle={{
                  ...styles.inputContainer,
                  backgroundColor: colors.neutral100,
                }}
                placeholder={t("typeMessage")}
                placeholderTextColor={isDark ? colors.neutral400 : colors.neutral500}
                editable={!isBlockedByMe}
                multiline
                onKeyPress={({ nativeEvent }) => {
                  if (chatSettings.enterIsSend && nativeEvent.key === "Enter") {
                    onSend();
                  }
                }}
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: colors.primary },
                  (!message.trim() && !selectedFile && !isBlockedByMe) && { opacity: 0.6 },
                ]}
                onPress={onSend}
                disabled={loading || (!message.trim() && !selectedFile && !isBlockedByMe)}
              >
                {loading ? (
                  <Loading size="small" color={colors.white} />
                ) : (
                  <Icons.PaperPlaneTilt size={scale(20)} color={colors.white} weight="fill" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardStickyView>
      </View>
    </View>
  );
};

export default Conversation;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
    overflow: "hidden",
  },
  wallpaperOrb: {
    position: "absolute",
    borderRadius: 999,
  },
  wallpaperOrbTop: {
    width: scale(220),
    height: scale(220),
    top: -scale(70),
    right: -scale(50),
  },
  wallpaperOrbBottom: {
    width: scale(260),
    height: scale(260),
    bottom: -scale(120),
    left: -scale(80),
  },
  headerSafeArea: {
    zIndex: 20,
    borderBottomWidth: 0.5,
  },
  header: {
    paddingHorizontal: spacingX._10,
    height: verticalScale(54),
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._3,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
    marginLeft: scale(5),
  },
  menuButton: {
    padding: scale(8),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuDropdown: {
    position: "absolute",
    right: spacingX._15,
    borderRadius: radius._15,
    width: scale(190),
    paddingVertical: spacingY._5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    zIndex: 100,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacingY._12,
    paddingHorizontal: spacingX._15,
    gap: spacingX._12,
  },
  menuDivider: {
    height: 1,
    marginHorizontal: spacingX._10,
    marginVertical: spacingY._5,
  },
  content: {
    flex: 1,
    position: "relative",
  },
  messagesContent: {
    paddingHorizontal: spacingX._15,
    paddingTop: spacingY._10,
    paddingBottom: spacingY._20,
    gap: spacingY._12,
  },
  typingBubble: {
    alignSelf: "flex-start",
    borderRadius: radius._15,
    paddingHorizontal: spacingX._15,
    paddingVertical: spacingY._12,
    marginBottom: spacingY._5,
    borderWidth: 1,
  },
  footerSticky: {
    zIndex: 10,
  },
  footer: {
    paddingHorizontal: spacingX._15,
    paddingTop: spacingY._12,
    borderTopWidth: 1,
  },
  actionBanner: {
    borderWidth: 1,
    borderRadius: radius._12,
    paddingHorizontal: spacingX._12,
    paddingVertical: spacingY._10,
    marginBottom: spacingY._10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacingX._10,
  },
  actionBannerContent: {
    flex: 1,
  },
  blockedNotice: {
    borderRadius: radius._12,
    paddingHorizontal: spacingX._12,
    paddingVertical: spacingY._10,
    marginBottom: spacingY._10,
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
  },
  unblockButton: {
    paddingHorizontal: spacingX._10,
    paddingVertical: spacingY._5,
  },
  footerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
  },
  attachmentPreview: {
    flexDirection: "row",
    paddingBottom: spacingY._10,
  },
  previewImage: {
    width: scale(60),
    height: scale(60),
    borderRadius: radius._10,
    borderWidth: 1,
  },
  removeFile: {
    position: "absolute",
    top: -5,
    left: 50,
    borderRadius: 10,
  },
  inputContainer: {
    flex: 1,
    borderRadius: radius._20,
    borderWidth: 0,
    minHeight: verticalScale(42),
    paddingHorizontal: spacingX._15,
    justifyContent: "center",
  },
  plusButton: {
    height: scale(38),
    width: scale(38),
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButton: {
    height: scale(38),
    width: scale(38),
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  chatBlockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: radius._10,
    borderWidth: 0.5,
    marginVertical: 10,
    gap: 8,
    maxWidth: "90%",
  },
});
