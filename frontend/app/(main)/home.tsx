import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  StatusBar,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import Avatar from "@/components/Avatar";
import ConversationItem from "@/components/ConversationItem";
import Typo from "@/components/Typo";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { useAuth } from "@/context/authContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { useTheme } from "@/context/themeContext";
import {
  chatCleared,
  conversationStopTyping,
  conversationTyping,
  conversationUpdated,
  getConversations,
  joinConversation,
  newConversation,
  presenceUpdated,
} from "@/socket/socketEvents";
import { connectSocket } from "@/socket/socket";
import { ConversationProps, ResponseProps } from "@/types";
import { loadLockedConversationIds, verifyChatLockPassword } from "@/utils/chatLock";
import { scale, verticalScale } from "@/utils/styling";
import LockChatsModal from "@/components/LockChatsModal";

const Home = () => {
  const { user, token, preloadedConversations } = useAuth();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useAppSettings();
  
  // --- Local State ---
  const [conversations, setConversations] = useState<ConversationProps[]>(preloadedConversations || []);
  const [loading, setLoading] = useState(preloadedConversations.length === 0);
  const [selectTab, setSelectedTab] = useState(0);
  const [search, setSearch] = useState("");
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [lockPassword, setLockPassword] = useState("");
  const [lockError, setLockError] = useState("");
  
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (preloadedConversations.length > 0) {
      setConversations(preloadedConversations);
      setLoading(false);
    }
  }, [preloadedConversations]);

  const refreshLockedIds = useCallback(async () => {
    if (!user?.id) return;
    const ids = await loadLockedConversationIds(String(user.id));
    setLockedIds(ids);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void refreshLockedIds();
    }, [refreshLockedIds])
  );

  useEffect(() => {
    if (conversations.length > 0) {
      // console.log("Joining conversations:", conversations.map(c => c._id)); 
      conversations.forEach((conversation) => joinConversation(conversation._id));
    }
  }, [conversations]);

  // --- Handlers to update Local State ---

  const mergeConversation = useCallback((incoming: ConversationProps) => {
    setLoading(false);
    setConversations((prev) => {
      const existingIndex = prev.findIndex((item) => String(item._id) === String(incoming._id));
      const next = [...prev];

      if (existingIndex >= 0) {
        next[existingIndex] = {
          ...next[existingIndex],
          ...incoming,
          typingUserId: incoming.typingUserId ?? next[existingIndex].typingUserId ?? null,
        };
      } else {
        next.unshift({ ...incoming, typingUserId: incoming.typingUserId ?? null });
      }

      return next.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
  }, []);

  const getConversationsHandler = useCallback((res: ResponseProps) => {
    if (!res.success || !res.data) {
      setLoading(false);
      return;
    }

    if (Array.isArray(res.data)) {
      setConversations(res.data);
      setLoading(false);
      return;
    }

    mergeConversation(res.data);
  }, [mergeConversation]);

  const newConversationHandler = useCallback((res: ResponseProps) => {
    if (res.success && res.data) {
      joinConversation(res.data._id);
      mergeConversation({ ...res.data, typingUserId: null });
    }
  }, [mergeConversation]);

  const conversationUpdatedHandler = useCallback((res: ResponseProps) => {
    // If the socket sends the full list on first load, handle array vs object
    if (!res.success || !res.data) {
      setLoading(false);
      return;
    }

    if (Array.isArray(res.data)) {
      setConversations(res.data);
      setLoading(false);
    } else {
      mergeConversation(res.data);
    }
  }, [mergeConversation]);

  const conversationTypingHandler = useCallback((res: ResponseProps) => {
    if (!res.success || !res.data) return;
    setConversations((prev) =>
      prev.map((conversation) =>
        String(conversation._id) === String(res.data.conversationId)
          ? { ...conversation, typingUserId: res.data.senderId }
          : conversation
      )
    );
  }, []);

  const conversationStopTypingHandler = useCallback((res: ResponseProps) => {
    if (!res.success || !res.data) return;
    setConversations((prev) =>
      prev.map((conversation) =>
        String(conversation._id) === String(res.data.conversationId)
          ? { ...conversation, typingUserId: null }
          : conversation
      )
    );
  }, []);

  const presenceUpdatedHandler = useCallback((res: ResponseProps) => {
    const payload = res.data || {};
    if (!payload?.userId) return;

    setConversations((prev) =>
      prev.map((conversation) => ({
        ...conversation,
        participants: conversation.participants.map((participant) =>
          String(participant._id) === String(payload.userId)
            ? {
                ...participant,
                isOnline: payload.showOnlineStatus ? payload.isOnline : false,
                lastSeen: payload.showOnlineStatus ? payload.lastSeen : null,
              }
            : participant
        ),
      }))
    );
  }, []);

  const chatClearedHandler = useCallback((res: ResponseProps) => {
    if (!res.success || !res.data) return;

    setConversations((prev) =>
      prev.map((conversation) =>
        String(conversation._id) === String(res.data.conversationId)
          ? { ...conversation, lastMessage: undefined, typingUserId: null }
          : conversation
      )
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchConversations = async () => {
      try {
        await connectSocket(token);
        if (!isMounted) return;

        getConversations(getConversationsHandler);
        getConversations({});
        newConversation(newConversationHandler);
        conversationUpdated(conversationUpdatedHandler);
        conversationTyping(conversationTypingHandler);
        conversationStopTyping(conversationStopTypingHandler);
        presenceUpdated(presenceUpdatedHandler);
        chatCleared(chatClearedHandler);
      } catch (error) {
        setLoading(false);
        console.warn("Conversation fetch skipped: socket connection failed");
      }
    };

    // 1. Fetch initial conversations and setup listeners
    fetchConversations();

    return () => {
      isMounted = false;
      getConversations(getConversationsHandler, true);
      newConversation(newConversationHandler, true);
      conversationUpdated(conversationUpdatedHandler, true);
      conversationTyping(conversationTypingHandler, true);
      conversationStopTyping(conversationStopTypingHandler, true);
      presenceUpdated(presenceUpdatedHandler, true);
      chatCleared(chatClearedHandler, true);
    };
  }, [
    getConversationsHandler,
    newConversationHandler,
    conversationUpdatedHandler,
    conversationTypingHandler,
    conversationStopTypingHandler,
    presenceUpdatedHandler,
    chatClearedHandler,
    token,
  ]);

  const displayData = useMemo(() => {
    const type = selectTab === 0 ? "direct" : "group";

    return conversations
      .filter((item) => !lockedIds.includes(String(item._id)))
      .filter((item) => item.type === type)
      .filter((item) => {
        const name =
          item.type === "group"
            ? item.name
            : item.participants?.find((participant) => participant._id !== user?.id)?.name;
        return name?.toLowerCase().includes(search.toLowerCase());
      });
  }, [conversations, lockedIds, search, selectTab, user?.id]);

  const lockedConversations = useMemo(
    () => conversations.filter((item) => lockedIds.includes(String(item._id))),
    [conversations, lockedIds]
  );

  const handleOpenLockedChats = async () => {
    if (!user?.id) return;

    const response = await verifyChatLockPassword(String(user.id), lockPassword);
    if (!response.success) {
      setLockError(response.msg || "Incorrect password.");
      return;
    }

    setLockModalVisible(false);
    setLockPassword("");
    setLockError("");
    router.push({
      pathname: "/(main)/lockedChats",
      params: { conversations: JSON.stringify(lockedConversations) },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(main)/profile")}
          style={styles.userInfo}
        >
          <Avatar size={scale(48)} uri={user?.avatar || ""} rounded={radius._15} />
          <View style={{ marginLeft: spacingX._12 }}>
            <Typo color={colors.neutral500} size={12}>
              {t("welcomeBack")}
            </Typo>
            <Typo size={20} color={colors.text} fontWeight={"700"}>
              {user?.name?.split(" ")[0]}
            </Typo>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push("/(main)/settings")}
        >
          <Icons.GearSix color={colors.text} weight="bold" size={scale(24)} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Icons.MagnifyingGlass size={scale(20)} color={colors.neutral500} />
          <TextInput
            placeholder={t("searchConversations")}
            placeholderTextColor={colors.neutral500}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            cursorColor={colors.primary}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => setSelectedTab(0)} style={styles.tabStyle}>
          <Typo
            color={selectTab === 0 ? colors.primary : colors.neutral500}
            fontWeight="700"
          >
            {t("messages")}
          </Typo>
          {selectTab === 0 && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setSelectedTab(1)} style={styles.tabStyle}>
          <Typo
            color={selectTab === 1 ? colors.primary : colors.neutral500}
            fontWeight="700"
          >
            {t("groups")}
          </Typo>
          {selectTab === 1 && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>

      {lockedConversations.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.lockedRow}
          onPress={() => {
            setLockPassword("");
            setLockError("");
            setLockModalVisible(true);
          }}
        >
          <View style={[styles.lockedIcon, { backgroundColor: colors.neutral100 }]}>
            <Icons.LockKey size={scale(20)} color={colors.primary} weight="fill" />
          </View>
          <Typo size={16} fontWeight="700" color={colors.text}>
            Locked chats
          </Typo>
          {/* <View style={styles.lockedCount}>
            <Typo size={12} color={colors.white} fontWeight="700">
              {lockedConversations.length}
            </Typo>
          </View> */}
        </TouchableOpacity>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.listContainer}>
          {loading ? (
             <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={colors.primary} />
             </View>
          ) : displayData.length > 0 ? (
            displayData.map((item, index) => (
              <ConversationItem
                item={item}
                key={item._id || index}
                router={router}
                showDivider={displayData.length !== index + 1}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icons.ChatCenteredText
                size={scale(64)}
                color={colors.neutral300}
                weight="thin"
              />
              <Typo color={colors.neutral500} style={{ marginTop: 10 }}>
                {t("noMessagesFound")}
              </Typo>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.floatingButton}
        onPress={() =>
          router.push({
            pathname: "/(main)/newConversationModal",
            params: { isGroup: selectTab },
          })
        }
      >
        {selectTab === 0 ? (
          <Icons.Plus color={colors.white} weight="bold" size={scale(28)} />
        ) : (
          <Icons.UsersThree color={colors.white} weight="fill" size={scale(28)} />
        )}
      </TouchableOpacity>

      {/* Lock Chats Modal */}
      <LockChatsModal
        visible={lockModalVisible}
        chatLocked={true}
        onClose={() => {
          setLockModalVisible(false);
          setLockPassword("");
          setLockError("");
        }}
        onSubmit={handleOpenLockedChats}
        passwordValue={lockPassword}
        setPasswordValue={setLockPassword}
        errorText={lockError}
        setErrorText={setLockError}
        colors={colors}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.white,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacingX._20,
      paddingVertical: spacingY._15,
    },
    userInfo: { flexDirection: "row", alignItems: "center" },
    iconButton: {
      backgroundColor: colors.neutral100,
      padding: scale(10),
      borderRadius: radius._12,
    },
    searchSection: {
      paddingHorizontal: spacingX._20,
      paddingBottom: spacingY._10,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.neutral100,
      borderRadius: radius._15,
      paddingHorizontal: spacingX._15,
      height: verticalScale(50),
    },
    searchInput: {
      flex: 1,
      marginLeft: spacingX._10,
      color: colors.text,
      fontSize: scale(16),
    },
    navBar: {
      flexDirection: "row",
      justifyContent: "center",
      width: "100%",
      paddingTop: spacingY._15,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral100,
    },
    tabStyle: {
      paddingBottom: spacingY._12,
      alignItems: "center",
      width: "45%",
    },
    activeIndicator: {
      position: "absolute",
      bottom: -1,
      width: "50%",
      height: 3,
      backgroundColor: colors.primary,
      borderRadius: radius.full,
    },
    lockedRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacingX._20,
      paddingVertical: spacingY._12,
      gap: spacingX._10,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral100,
    },
    lockedIcon: {
      width: scale(36),
      height: scale(36),
      borderRadius: radius._10,
      alignItems: "center",
      justifyContent: "center",
    },
    lockedCount: {
      marginLeft: "auto",
      minWidth: scale(24),
      height: scale(24),
      borderRadius: radius.full,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacingX._7,
    },
    scrollContent: {
      paddingBottom: verticalScale(120),
    },
    listContainer: {
      paddingHorizontal: spacingX._20,
      paddingTop: spacingY._10,
    },
    centerBox: {
      marginTop: verticalScale(50),
      alignItems: "center",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      marginTop: verticalScale(100),
    },
    floatingButton: {
      height: scale(60),
      width: scale(60),
      borderRadius: scale(30),
      position: "absolute",
      bottom: Platform.OS === "ios" ? spacingY._40 : spacingY._30,
      right: spacingX._20,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      elevation: 5,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(17, 24, 39, 0.45)",
      justifyContent: "center",
      paddingHorizontal: spacingX._20,
    },
    passwordCard: {
      borderRadius: radius._20,
      padding: spacingX._20,
    },
    passwordInput: {
      marginTop: spacingY._15,
      borderRadius: radius._12,
      paddingHorizontal: spacingX._15,
      height: verticalScale(48),
      fontSize: scale(16),
    },
    passwordActions: {
      flexDirection: "row",
      gap: spacingX._10,
      marginTop: spacingY._15,
    },
    passwordButton: {
      flex: 1,
      height: verticalScale(46),
      borderRadius: radius._12,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default Home;
