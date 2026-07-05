import { View, StyleSheet, TouchableOpacity } from 'react-native'
import React, { useState, useEffect, useMemo } from 'react'
import { colors, spacingX, spacingY } from '@/constants/theme';
import { ConversationListItemProps } from '@/types';
import Avatar from './Avatar';
import Typo from './Typo';
import moment from 'moment'
import { useAuth } from '@/context/authContext';
import { useTheme } from '@/context/themeContext';
import { useAppSettings } from '@/context/appSettingsContext';
import * as Icons from "phosphor-react-native";
import { decryptMessageE2EForUser } from '@/utils/messageEncryption';

const ConversationItem = ({ item, showDivider, router }: ConversationListItemProps) => {

  const { user: currentUser } = useAuth()
  const { colors: themeColors } = useTheme();
  const { t, isConversationMuted } = useAppSettings();

  const lastMessage: any = item.lastMessage

  const [decryptedContent, setDecryptedContent] = useState<string>(
    lastMessage && !lastMessage.encrypted ? lastMessage.content : "Encrypted message"
  );

  useEffect(() => {
    let isMounted = true;
    const decryptLast = async () => {
      if (!lastMessage || !currentUser?.id) return;
      if (!lastMessage.encrypted) {
        if (isMounted) setDecryptedContent(lastMessage.content);
        return;
      }
      try {
        const decrypted = await decryptMessageE2EForUser(lastMessage, currentUser.id);
        if (isMounted) {
          setDecryptedContent(decrypted.content || "Encrypted message");
        }
      } catch (error) {
        console.error("Failed to decrypt last message in list:", error);
        if (isMounted) setDecryptedContent("This message could not be decrypted");
      }
    };
    void decryptLast();
    return () => {
      isMounted = false;
    };
  }, [lastMessage, currentUser?.id]);

  const isDirect = item.type === 'direct'
  const conversationMuted = item.isMuted || isConversationMuted(item._id);
  let avatar = item.avatar
  const otherParticipant = isDirect ? item.participants.find(p => p._id !== currentUser?.id) : null

  if (isDirect && otherParticipant) {
    avatar = otherParticipant?.avatar
  }

  // Memoized block check
  const isTargetBlocked = useMemo(() => {
    const blockedIds = currentUser?.settings?.privacy?.blockedUserIds || currentUser?.blockedUsers || [];
    return blockedIds.map(String).includes(String(otherParticipant?._id));
  }, [currentUser?.blockedUsers, currentUser?.settings?.privacy?.blockedUserIds, otherParticipant?._id]);

  const getMessageDate = () => {
    // Hide date if user is blocked (Optional but recommended)
    if (isDirect && isTargetBlocked) return null;
    if (!lastMessage?.createdAt) return null
    const messageDate = moment(lastMessage.createdAt)
    const today = moment();

    if (messageDate.isSame(today, "day")) return messageDate.format("h:mm A")
    if (messageDate.isSame(today, "year")) return messageDate.format("MMM D")
    return messageDate.format("MMM D, YYYY")
  }

  const getLastMessageContent = () => {
    // 1. Check if the direct contact is blocked first
    if (isDirect && isTargetBlocked) return t("youBlockedThisContact") || "You blocked this contact";

    // 2. Fall back to standard checks if not blocked
    if (item.typingUserId && item.typingUserId !== currentUser?.id) return "Typing...";
    if (!lastMessage) return "Say hi 👋"
    if (lastMessage?.isDeleted) return t("messageDeleted");
    return lastMessage?.attachment ? "📷 Image" : (decryptedContent || lastMessage.content);
  }

  const openConversation = () => {
    router.push({
      pathname: "/(main)/conversation",
      params: {
        id: item._id,
        name: isDirect ? otherParticipant?.name : item.name,
        avatar: avatar,
        type: item.type,
        participants: JSON.stringify(item.participants)
      }
    })
  }

  const openContactProfile = () => {
    if (isDirect && otherParticipant) {
      router.push({
        pathname: "/(main)/profile",
        params: {
          id: otherParticipant._id,
          name: otherParticipant.name,
          avatar: otherParticipant.avatar,
          email: otherParticipant.email,
          conversationId: item._id,
        }
      });
    } else {
      console.log("Group profile clicked");
    }
  }

  return (
    <View>
      <View style={styles.conversationItem}>

        {/* AVATAR TOUCHABLE */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={openContactProfile}
          style={styles.avatarContainer}
        >
          <Avatar uri={avatar} size={47} isGroup={item.type === 'group'} />
        </TouchableOpacity>

        {/* CONTENT TOUCHABLE */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.contentContainer}
          onPress={openConversation}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.row}>
              <Typo size={17} fontWeight={'600'}>
                {isDirect ? otherParticipant?.name : item?.name}
              </Typo>
              <View style={styles.rowRight}>
                {conversationMuted && (
                  <Icons.BellSlash size={14} color={themeColors.neutral500} weight="fill" />
                )}
                {/* Condition altered to check if date string actually exists */}
                {getMessageDate() && (
                  <Typo size={13} color={colors.neutral500}>{getMessageDate()}</Typo>
                )}
              </View>
            </View>
            <View style={styles.row}>
              <Typo
                size={14}
                color={item.typingUserId && item.typingUserId !== currentUser?.id && !isTargetBlocked ? themeColors.primary : colors.neutral500}
                style={{ flex: 1, marginRight: 8 }}
                textProps={{ numberOfLines: 1 }}
              >
                {getLastMessageContent()}
              </Typo>

              {/* Hide unread badges if the contact is blocked */}
              {item.unreadCount !== undefined && item.unreadCount > 0 && !(isDirect && isTargetBlocked) && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Typo size={11} color={colors.white} fontWeight="700">
                    {item.unreadCount}
                  </Typo>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

      </View>
      {showDivider && <View style={[styles.divider, { backgroundColor: themeColors.neutral200 }]} />}
    </View>
  )
}

export default ConversationItem;

// Styles remain unchanged
const styles = StyleSheet.create({
  conversationItem: {
    marginVertical: spacingY._7,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacingX._15,
  },
  avatarContainer: {
    marginRight: spacingX._12,
  },
  contentContainer: {
    flex: 1,
    paddingVertical: spacingY._5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
  },
  divider: {
    height: 1,
    width: "80%",
    alignSelf: "flex-end",
    marginRight: spacingX._15,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
});