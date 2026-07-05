import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Avatar from "@/components/Avatar";
import Typo from "@/components/Typo";
import Loading from "@/components/Loading";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { useAuth } from "@/context/authContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { useTheme } from "@/context/themeContext";
import { useCustomAlert } from "@/context/customAlertContext"; 
import { scale, verticalScale } from "@/utils/styling";
import { 
  getUserProfile, 
  clearChat as clearChatApi, 
  blockUser as blockUserApi,
  getSharedContent,
  reportUser as reportUserApi,
  updateUserSettings,
} from "@/services/authService"; 
import {
  ensureChatLockPassword,
  isConversationLocked,
  setConversationLocked,
} from "@/utils/chatLock";
import { getOrCreateEncryptionIdentity } from "@/utils/messageEncryption";
import { removeOfflineMessagesForConversation } from "@/utils/offlineMessages"; 
import LockChatsModal from "@/components/LockChatsModal";

const { width } = Dimensions.get("window");

const Profile = () => {
  const { user: currentUser, token, setPreloadedConversations, updateToken } = useAuth();
  const { colors } = useTheme();
  const { t } = useAppSettings();
  const { showAlert } = useCustomAlert();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [profileState, setProfileState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedContent, setSharedContent] = useState<any>({ media: [], links: [], docs: [] });
  const [chatLocked, setChatLocked] = useState(false);
  const [lockPasswordVisible, setLockPasswordVisible] = useState(false);
  const [lockPassword, setLockPassword] = useState("");
  const [lockError, setLockError] = useState<string>("");

  const isMyProfile = !params.id || params.id === currentUser?.id;
  const targetUserId = Array.isArray(params.id) ? params.id[0] : params.id;
  const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : params.conversationId;

  const stringifiedParticipants = params.stringifiedParticipants || params.participants;
  const conversationParticipantIds: string[] = useMemo(() => {
    try {
      if (!stringifiedParticipants) {
        return currentUser?.id && targetUserId ? [String(currentUser.id), String(targetUserId)] : [];
      }
      return JSON.parse(stringifiedParticipants as string);
    } catch {
      return currentUser?.id && targetUserId ? [String(currentUser.id), String(targetUserId)] : [];
    }
  }, [stringifiedParticipants, currentUser?.id, targetUserId]);

  // Fetch other user's profile
  useEffect(() => {
    if (isMyProfile || !targetUserId || !token) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getUserProfile(token, targetUserId);

        if (response.success) {
          if (response.data?.isPrivate) {
            setProfileState({ isPrivate: true });
            setError(response.data?.message || "This profile is private");
          } else {
            setProfileState({ user: response.data?.user, isPrivate: false });
          }
        } else {
          setError(response.msg || "Failed to load profile");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [targetUserId, isMyProfile, token]);

  const displayUser = useMemo(() => {
    if (isMyProfile) return currentUser;
    return profileState?.user || {
      id: targetUserId,
      name: Array.isArray(params.name) ? params.name[0] : params.name,
      avatar: Array.isArray(params.avatar) ? params.avatar[0] : params.avatar,
      bio: t("defaultBio"),
      email: Array.isArray(params.email) ? params.email[0] : params.email,
    };
  }, [currentUser, isMyProfile, params.avatar, params.name, profileState, targetUserId, t]);
  
  // Memoized value returning whether target is in user's blocked items array
  const isTargetBlocked = useMemo(() => {
    const blockedIds = currentUser?.settings?.privacy?.blockedUserIds || currentUser?.blockedUsers || [];
    return blockedIds.map(String).includes(String(targetUserId));
  }, [currentUser?.blockedUsers, currentUser?.settings?.privacy?.blockedUserIds, targetUserId]);

  const disappearingTimer = currentUser?.settings?.privacy?.disappearingMessagesTimer || "off";

  useEffect(() => {
    let isMounted = true;

    const loadSharedContent = async () => {
      if (!token || !conversationId) return;

      try {
        const response = await getSharedContent(token, String(conversationId));
        if (isMounted && response?.success) {
          setSharedContent(response.data || { media: [], links: [], docs: [] });
        }
      } catch {
        // Profile still works if media preview cannot load.
      }
    };

    void loadSharedContent();

    return () => {
      isMounted = false;
    };
  }, [conversationId, token]);

  useEffect(() => {
    let isMounted = true;

    const loadLockState = async () => {
      if (!currentUser?.id || !conversationId) return;
      const locked = await isConversationLocked(String(currentUser.id), String(conversationId));
      if (isMounted) setChatLocked(locked);
    };

    void loadLockState();

    return () => {
      isMounted = false;
    };
  }, [conversationId, currentUser?.id]);


  // CLEAR CHAT WORKFLOW
  const handleClearChat = () => {
    if (!conversationId || !token) {
      showAlert({
        title: t("clearChat") || "Clear Chat",
        message: "No active conversation found to clear.",
        variant: "info",
      });
      return;
    }

    showAlert({
      title: t("clearChat") || "Clear Conversation",
      message: `Are you sure you want to clear your chat history with ${displayUser?.name || "this user"}? This action cannot be undone.`,
      variant: "warning",
      buttons: [
        { text: t("cancel") || "Cancel", style: "cancel" },
        {
          text: t("clearChatForMe") || "Clear For Me",
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
              
              setPreloadedConversations((prev: any[]) =>
                prev.map((chat) =>
                  String(chat._id) === String(conversationId)
                    ? { ...chat, lastMessage: undefined }
                    : chat
                )
              );

              showAlert({ title: t("clearChat"), message: "Chat cleared locally.", variant: "success" });
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
          text: t("clearChatForEveryone") || "Clear For Everyone",
          style: "destructive",
          onPress: async () => {
            const response = await clearChatApi(token, String(conversationId), { scope: "everyone" });
            if (response?.success) {
              if (currentUser?.id) {
                await removeOfflineMessagesForConversation(
                  String(currentUser.id),
                  String(conversationId),
                  conversationParticipantIds
                );
              }
              showAlert({ title: t("clearChat"), message: "Chat cleared for everyone.", variant: "success" });
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

  // BLOCK / UNBLOCK TRANSACTION LOGIC
  const handleBlockUser = () => {
    if (!targetUserId || !token) {
      showAlert({
        title: t("blockUser") || "Block User",
        message: "Missing parameters required to perform this action.",
        variant: "danger",
      });
      return;
    }

    console.log(isTargetBlocked);

    // Dynamic titles based on current status
    const dynamicTitle = isTargetBlocked 
      ? `${t("unblockUser") || "Unblock"} ${displayUser?.name || "User"}?`
      : `${t("blockUser") || "Block"} ${displayUser?.name || "User"}?`;

    const dynamicMessage = isTargetBlocked
      ? `Are you sure you want to unblock ${displayUser?.name || "this user"}? They will be able to send you messages and call you again.`
      : "Blocked contacts will no longer be able to call you or send you messages. This action can be undone later.";

    const actionText = isTargetBlocked ? (t("unblockUser") || "Unblock") : (t("blockUser") || "Block");

    showAlert({
      title: dynamicTitle,
      message: dynamicMessage,
      variant: isTargetBlocked ? "info" : "danger",
      buttons: [
        { text: t("cancel") || "Cancel", style: "cancel" },
        {
          text: actionText,
          style: isTargetBlocked ? "default" : "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              // Call your block/unblock API function. 
              // Note: If your API separates these endpoints, use: isTargetBlocked ? unblockUserApi(...) : blockUserApi(...)
              const response = await blockUserApi(token, String(targetUserId));
              console.log("Block/Unblock API response:", response);
              
              if (response?.success) {
                if (response.token) {
                  await updateToken(response.token);
                }

                if (!isTargetBlocked && conversationId) {
                  // If just blocked, filter out active chats previews
                  setPreloadedConversations((prev: any[]) =>
                    prev.filter((chat) => String(chat._id) !== String(conversationId))
                  );
                }

                showAlert({
                  title: isTargetBlocked ? (t("unblocked") || "Unblocked") : (t("blocked") || "Blocked"),
                  message: isTargetBlocked
                    ? `${displayUser?.name || "User"} has been unblocked.`
                    : `You blocked ${displayUser?.name || "this user"}. Use Unblock User here before messaging again.`,
                  variant: "success",
                });
              } else {
                showAlert({
                  title: isTargetBlocked ? "Unblock Failed" : "Block Failed",
                  message: response?.msg || t("somethingWentWrong"),
                  variant: "danger",
                });
              }
            } catch (err: any) {
              showAlert({
                title: isTargetBlocked ? "Unblock Failed" : "Block Failed",
                message: err.message || "An unexpected error occurred.",
                variant: "danger",
              });
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      dismissible: false,
    });
  };

  const handleDisappearingMessages = () => {
    if (!token) return;

    const options = [
      { label: "Off", value: "off" },
      { label: "24 hours", value: "24h" },
      { label: "7 days", value: "7d" },
      { label: "90 days", value: "90d" },
    ];

    showAlert({
      title: "Disappearing Messages",
      message: "Choose the timer for new messages you send. Existing messages keep their current timer.",
      variant: "info",
      buttons: [
        ...options.map((option) => ({
          text: option.label,
          onPress: async () => {
            const response = await updateUserSettings(token, {
              settings: {
                privacy: {
                  disappearingMessagesTimer: option.value as any,
                },
              },
            });

            const nextToken = response?.token || response?.data?.token;
            if (response?.success && nextToken) {
              await updateToken(nextToken);
            }

            showAlert({
              title: "Disappearing Messages",
              message: `Timer set to ${option.label}.`,
              variant: "success",
            });
          },
        })),
        { text: t("cancel") || "Cancel", style: "cancel" },
      ],
    });
  };

  const openChatLockPassword = () => {
    if (!conversationId) {
      showAlert({
        title: "Chat Lock",
        message: "Open this chat once before locking it.",
        variant: "info",
      });
      return;
    }

    setLockPassword("");
    setLockPasswordVisible(true);
  };

  const submitChatLockPassword = async () => {
    if (!currentUser?.id || !conversationId) return;

    const response = await ensureChatLockPassword(String(currentUser.id), lockPassword);
    if (!response.success) {
      showAlert({ title: "Chat Lock", message: response.msg, variant: "danger" });
      return;
    }

    const nextLocked = !chatLocked;
    await setConversationLocked(String(currentUser.id), String(conversationId), nextLocked);
    setChatLocked(nextLocked);
    setLockPasswordVisible(false);
    setLockPassword("");

    showAlert({
      title: "Chat Lock",
      message: nextLocked
        ? "This chat is now hidden in Locked chats."
        : "This chat has been removed from Locked chats.",
      variant: "success",
    });
  };

  const handleReportUser = () => {
    if (!token || !targetUserId) return;

    const reasons = ["Spam", "Harassment", "Fraud or scam", "Inappropriate content"];
    showAlert({
      title: "Report User",
      message: `Tell us why you are reporting ${displayUser?.name || "this user"}.`,
      variant: "danger",
      buttons: [
        ...reasons.map((reason) => ({
          text: reason,
          style: "destructive" as const,
          onPress: async () => {
            const response = await reportUserApi(token, String(targetUserId), {
              reason,
              additionalDetails: `Reported from profile${conversationId ? `, conversation ${conversationId}` : ""}.`,
            });

            showAlert({
              title: response?.success ? "Report Submitted" : "Report Failed",
              message: response?.msg || t("somethingWentWrong"),
              variant: response?.success ? "success" : "danger",
            });
          },
        })),
        { text: t("cancel") || "Cancel", style: "cancel" },
      ],
    });
  };

  const handleEncryption = async () => {
    if (!token) return;

    try {
      if (!currentUser?.publicEncryptionKey) {
        const identity = await getOrCreateEncryptionIdentity(String(currentUser?.id), token, currentUser?.publicEncryptionKey);
        if (identity?.token) {
          await updateToken(identity.token);
        }

        if (identity?.publicKey) {
          showAlert({
            title: "Encryption",
            message: "Your encryption identity is ready. New chats can exchange public keys for encrypted payloads.",
            variant: "success",
          });
          return;
        }
      }

      showAlert({
        title: "Encryption",
        message: displayUser?.publicEncryptionKey
          ? "This contact has an encryption identity on this account."
          : "Your account is encryption-ready. This contact has not published an encryption identity yet.",
        variant: "info",
      });
    } catch {
      showAlert({
        title: "Encryption",
        message: "Could not prepare encryption identity right now.",
        variant: "danger",
      });
    }
  };

  const SettingItem = ({
    icon: Icon,
    title,
    subtitle,
    value,
    onPress,
    color = colors.text,
    showBorder = true,
    showChevron = true
  }: any) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.item,
        { borderBottomColor: colors.neutral200 },
        !showBorder && { borderBottomWidth: 0 }
      ]}
    >
      <View style={styles.itemLeft}>
        <View style={styles.iconContainer}>
          <Icon size={scale(22)} color={color} weight="regular" />
        </View>
        <View style={styles.textContainer}>
          <Typo size={16} fontWeight="500" color={color}>{title}</Typo>
          {subtitle && (
            <Typo size={13} color={colors.neutral500} style={styles.subtitle}>
              {subtitle}
            </Typo>
          )}
        </View>
      </View>

      <View style={styles.itemRight}>
        {value && <Typo color={colors.neutral500} size={14} style={{ marginRight: 4 }}>{value}</Typo>}
        {showChevron && <Icons.CaretRight size={scale(16)} color={colors.neutral400} weight="bold" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.neutral100 }]}>
          <Icons.CaretLeft size={scale(24)} color={colors.black} weight="bold" />
        </TouchableOpacity>
        <Typo size={20} fontWeight="700">{isMyProfile ? t("myProfile") : t("profile")}</Typo>
        {isMyProfile ? (
          <TouchableOpacity onPress={() => router.push("/(main)/settings")}>
            <Icons.GearSix size={scale(24)} color={colors.black} weight="bold" />
          </TouchableOpacity>
        ) : <View style={{ width: scale(40) }} />}
      </View>

      {/* Loading State */}
      {loading && !isMyProfile && (
        <View style={styles.centerContent}>
          <Loading />
        </View>
      )}

      {/* Error State */}
      {error && !isMyProfile && profileState?.isPrivate && (
        <View style={styles.centerContent}>
          <Icons.LockIcon size={scale(48)} color={colors.neutral400} weight="fill" />
          <Typo size={18} fontWeight="600" style={{ marginTop: spacingY._15, textAlign: 'center' }}>
            {error}
          </Typo>
        </View>
      )}

      {/* Profile Content */}
      {(!loading || isMyProfile) && !error && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          <View style={styles.profileHeaderSection}>
            <View style={styles.avatarWrapper}>
              <Avatar size={scale(100)} uri={displayUser?.avatar || ""} rounded={radius._30} />
              {isMyProfile && (
                <TouchableOpacity
                  style={[styles.editBadge, { backgroundColor: colors.primary, borderColor: colors.white }]}
                  onPress={() => router.push("/(main)/profileModal")}
                >
                  <Icons.PencilSimple size={scale(14)} color={colors.white} weight="fill" />
                </TouchableOpacity>
              )}
            </View>
            <Typo size={22} fontWeight="800" style={{ marginTop: spacingY._15 }}>{displayUser?.name}</Typo>
            {displayUser?.email && (
              <Typo size={16} fontWeight="500" color={colors.neutral500} style={{ marginTop: spacingY._5 }}>
                {displayUser.email}
              </Typo>
            )}
            <Typo size={14} color={colors.neutral500} style={styles.bio}>{displayUser?.bio || t("defaultBio")}</Typo>
          </View>

          {!isMyProfile && isTargetBlocked && (
            <View style={[styles.blockedBanner, { backgroundColor: colors.neutral100 }]}>
              <Icons.Prohibit size={scale(20)} color={colors.rose} weight="bold" />
              <View style={{ flex: 1 }}>
                <Typo size={14} fontWeight="700" color={colors.text}>
                  You blocked this user
                </Typo>
                <Typo size={12} color={colors.neutral500}>
                  Unblock this user to send or receive messages.
                </Typo>
              </View>
              <TouchableOpacity onPress={handleBlockUser} style={styles.unblockPill}>
                <Typo size={13} color={colors.primary} fontWeight="700">
                  Unblock
                </Typo>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.lineSeparator, { backgroundColor: colors.neutral200 }]} />

          <View style={styles.section}>
            <Typo size={13} color={colors.neutral400} fontWeight="600" style={styles.sectionLabel}>
              {t("mediaLinksDocs") || "MEDIA, LINKS, AND DOCS"}
            </Typo>
            <View style={[styles.sectionBody, { backgroundColor: colors.neutral100 }]}>
              <View style={styles.mediaPreviewRow}>
                {[0, 1, 2, 3].map(i => (
                  <View key={i} style={[styles.mediaSquare, { backgroundColor: colors.neutral200 }]}>
                    {sharedContent.media?.[i]?.url && (
                      <Image
                        source={{ uri: sharedContent.media[i].url }}
                        contentFit="cover"
                        style={StyleSheet.absoluteFillObject}
                      />
                    )}
                  </View>
                ))}
              </View>
              <SettingItem
                icon={Icons.ImageIcon}
                title="View all media"
                value={`${(sharedContent.media?.length || 0) + (sharedContent.links?.length || 0) + (sharedContent.docs?.length || 0)}`}
                showBorder={false}
                onPress={() => router.push({
                  pathname: "/(main)/sharedMedia",
                  params: {
                    conversationId,
                    name: displayUser?.name,
                  },
                })}
              />
            </View>
          </View>

          {!isMyProfile && (
            <View style={styles.section}>
              <Typo size={13} color={colors.neutral400} fontWeight="600" style={styles.sectionLabel}>
                {t("privacySettings") || "PRIVACY & SETTINGS"}
              </Typo>

              {/* Main Settings Group */}
              <View style={[styles.sectionBody, { backgroundColor: colors.neutral100, marginBottom: spacingY._15 }]}>
                <SettingItem 
                  icon={Icons.BellSimpleIcon}
                  title="Notifications"
                  onPress={() => router.push({
                    pathname: "/(main)/profile/notification",
                    params: {
                      id: targetUserId,
                      name: displayUser?.name,
                      avatar: displayUser?.avatar,
                      email: displayUser?.email,
                      conversationId: conversationId
                    }
                  })} 
                />
                <SettingItem
                  icon={Icons.ClockAfternoonIcon}
                  title="Disappearing Messages"
                  value={disappearingTimer === "off" ? "Off" : disappearingTimer}
                  onPress={handleDisappearingMessages}
                />
                <SettingItem
                  icon={Icons.ChatTeardropDotsIcon}
                  title="Chat Lock"
                  value={chatLocked ? "On" : "Off"}
                  onPress={openChatLockPassword}
                />
                <SettingItem icon={Icons.LockIcon} title="Encryption" showBorder={false} onPress={handleEncryption} />
              </View>

              <Typo size={13} color={colors.neutral400} fontWeight="600" style={styles.sectionLabel}>
                {t("destructiveActions") || "DESTRUCTIVE ACTIONS"}
              </Typo>

              {/* Destructive Actions Group */}
              <View style={[styles.sectionBody, { backgroundColor: colors.neutral100 }]}>
                <SettingItem 
                  icon={Icons.TrashIcon} 
                  title={t("clearChat") || "Clear Chat"} 
                  color={colors.rose} 
                  onPress={handleClearChat}
                />
                <SettingItem 
                  icon={Icons.ProhibitIcon} 
                  title={
                    isTargetBlocked ?
                      (t("unblockUser") || "Unblock User") :
                      (t("blockUser") || "Block User")
                  } 
                  color={colors.rose} 
                  onPress={handleBlockUser}
                />
                <SettingItem
                  icon={Icons.WarningCircleIcon}
                  title="Report User"
                  color={colors.rose}
                  showBorder={false}
                  onPress={handleReportUser}
                />
              </View>
            </View>
          )}

        </ScrollView>
      )}

      <LockChatsModal
        visible={lockPasswordVisible}
        chatLocked={chatLocked} // true or false depending on current chat state
        onClose={() => setLockPasswordVisible(false)}
        onSubmit={submitChatLockPassword}
        passwordValue={lockPassword}
        setPasswordValue={setLockPassword}
        errorText={lockError}
        setErrorText={setLockError}
        colors={colors}
/>
    </SafeAreaView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingX._20,
    paddingVertical: spacingY._15,
  },
  backButton: {
    padding: scale(8),
    borderRadius: radius._10,
  },
  scrollContent: { paddingHorizontal: spacingX._20, paddingBottom: verticalScale(40) },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacingX._20,
  },
  profileHeaderSection: { alignItems: 'center', paddingVertical: spacingY._20 },
  avatarWrapper: { position: 'relative' },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    padding: scale(6),
    borderRadius: 100,
    borderWidth: 3,
  },
  bio: { textAlign: 'center', marginTop: 5, paddingHorizontal: 20 },
  blockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
    borderRadius: radius._15,
    padding: spacingX._15,
    marginBottom: spacingY._15,
  },
  unblockPill: {
    paddingHorizontal: spacingX._10,
    paddingVertical: spacingY._7,
  },
  section: { marginBottom: spacingY._20 },
  sectionLabel: { marginBottom: spacingY._10, marginLeft: spacingX._5, letterSpacing: 1 },
  sectionBody: {
    borderRadius: radius._15,
    paddingHorizontal: spacingX._15,
  },
  mediaPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacingY._15,
    paddingBottom: spacingY._5
  },
  mediaSquare: {
    width: (width - spacingX._20 * 2 - spacingX._15 * 2 - 30) / 4,
    height: (width - spacingX._20 * 2 - spacingX._15 * 2 - 30) / 4,
    borderRadius: radius._10,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacingY._15,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  textContainer: {
    flexDirection: "column",
    justifyContent: "center",
    marginLeft: scale(12),
    flex: 1,
  },
  subtitle: { marginTop: scale(2) },
  iconContainer: { padding: scale(4) },
  itemRight: { flexDirection: "row", alignItems: "center" },
  lineSeparator: {
    height: 1,
    width: "100%",
    marginVertical: 4,
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
  passwordHint: {
    marginTop: spacingY._10,
    lineHeight: verticalScale(20),
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
