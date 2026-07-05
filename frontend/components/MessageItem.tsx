import { View, StyleSheet, TouchableOpacity } from "react-native";
import React from "react";
import * as Icons from "phosphor-react-native";
import { MessageProps } from "@/types";
import { useAuth } from "@/context/authContext";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import Avatar from "./Avatar";
import Typo from "./Typo";
import moment from "moment";
import { Image } from "expo-image";
import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { createDefaultUserSettings } from "@/constants/userSettings";

const MessageItem = ({
  item,
  isDirect,
  onLongPress,
  onReply,
}: {
  item: MessageProps;
  isDirect: boolean;
  onLongPress?: (item: MessageProps) => void;
  onReply?: (item: MessageProps) => void;
}) => {
  const { user: currentUser } = useAuth();
  const { colors } = useTheme(); // Use the dynamic theme colors
  const { t, settings } = useAppSettings();
  const chatSettings = settings?.chats || createDefaultUserSettings().chats;
  const messageFontSize =
    chatSettings.fontSize === "small"
      ? 14
      : chatSettings.fontSize === "large"
        ? 17
        : 15;

  const sender: any = item?.sender;
  const isMe = String(currentUser?.id) === String(sender?._id || sender?.id);

  const formattedDate = item?.createdAt
    ? moment(item.createdAt).isSame(moment(), "day")
      ? moment(item.createdAt).format("hh:mm A")
      : moment(item.createdAt).format("MMM D")
    : "";

  const deliveredTo = item.deliveredTo || [];
  const seenBy = item.seenBy || [];
  const isSeen = seenBy.some((id) => String(id) !== String(currentUser?.id));
  const isDelivered = deliveredTo.some((id) => String(id) !== String(currentUser?.id));
  const isPending = item.syncStatus === "pending";
  const isSending = item.syncStatus === "sending";
  const isFailed = item.syncStatus === "failed";
  const showReplyPreview = Boolean(item?.replyTo && !item?.isDeleted && !item.replyTo?.isDeleted);
  const receiptColor = isFailed
    ? colors.rose
    : isPending || isSending
      ? colors.neutral500
      : isSeen
        ? "#EAB308"
        : isDelivered
          ? colors.neutral700
          : colors.neutral400;
  const ReceiptIcon = isFailed
    ? Icons.WarningCircle
    : isSending
      ? Icons.CircleNotch
      : isPending
        ? Icons.ClockCountdown
        : isSeen || isDelivered
          ? Icons.Checks
          : Icons.Check;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onLongPress={() => onLongPress?.(item)}
      onPress={() => onReply?.(item)}
      style={[
        styles.messageContainer,
        isMe ? styles.myMessage : styles.theirMessage,
      ]}
    >
      {/* show avatar only for group + only for other user */}
      {!isMe && !isDirect && (
        <Avatar
          uri={sender?.avatar || null}
          size={30}
          style={styles.messageAvatar}
        />
      )}

      {/* bubble */}
      <View
        style={[
          styles.messageBubble,
          { backgroundColor: isMe ? colors.myBubble : colors.otherBubble },
        ]}
      >
        {/* sender name (only in group messages + not me) */}
        {!isMe && !isDirect && (
          <Typo size={12} color={colors.neutral600} fontWeight="600">
            {sender?.name || "User"}
          </Typo>
        )}

        {showReplyPreview && (
          <View style={[styles.replyPreview, { borderLeftColor: colors.primary, backgroundColor: colors.neutral100 }]}>
            <Typo size={11} fontWeight="700" color={colors.neutral700}>
              {item.replyTo?.sender?.name || t("reply")}
            </Typo>
            <Typo size={12} color={colors.neutral600} textProps={{ numberOfLines: 1 }}>
              {item.replyTo?.content || (item.replyTo?.attachment ? "📷 Image" : "")}
            </Typo>
          </View>
        )}

        {/* attachment preview */}
        {!!item?.attachment && !item?.isDeleted && (
          <Image
            source={{ uri: item.attachment }}
            contentFit="cover"
            style={styles.attachment}
            transition={100}
          />
        )}

        {/* message text */}
        {!!item?.content && !item?.isDeleted && (
          <View style={styles.messageTextRow}>
            {item.encrypted && (
              <Icons.LockKey
                size={12}
                color={item.decryptionFailed ? colors.rose : colors.neutral500}
                weight="fill"
              />
            )}
            <Typo
              size={messageFontSize}
              color={item.decryptionFailed ? colors.neutral500 : colors.text}
              style={item.decryptionFailed ? styles.deletedText : undefined}
            >
              {item.content}
            </Typo>
          </View>
        )}

        {!!item?.isDeleted && (
          <Typo size={14} color={colors.neutral500} style={styles.deletedText}>
            {t("messageDeleted")}
          </Typo>
        )}

        {/* time + status */}
        {!!item?.createdAt && (
          <View style={styles.statusRow}>
            <Typo 
              size={10} 
              color={colors.neutral500} 
              style={{ opacity: 0.8 }}
            >
              {formattedDate}{item?.editedAt && !item?.isDeleted ? ` • ${t("edited")}` : ""}
            </Typo>

            {isMe && (
              <ReceiptIcon
                size={14}
                color={receiptColor}
                weight={isFailed || isSeen ? "fill" : "bold"}
              />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default MessageItem;

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: "row",
    gap: spacingX._7,
    maxWidth: "85%", // Increased slightly for better text fit
  },
  myMessage: {
    alignSelf: "flex-end",
  },
  theirMessage: {
    alignSelf: "flex-start",
  },
  messageAvatar: {
    alignSelf: "flex-end",
    marginBottom: 2,
  },
  attachment: {
    height: verticalScale(200),
    width: verticalScale(200),
    borderRadius: radius._12,
    marginVertical: spacingY._5,
  },
  messageBubble: {
    paddingHorizontal: spacingX._12,
    paddingVertical: spacingY._7,
    borderRadius: radius._15,
    // Add logic for message tail-like appearance if desired
    borderBottomRightRadius: radius._3, // Optional: sharper corner for 'me'
  },
  replyPreview: {
    borderLeftWidth: 3,
    paddingLeft: spacingX._10,
    paddingVertical: spacingY._5,
    marginBottom: spacingY._5,
    borderRadius: radius._10,
  },
  deletedText: {
    fontStyle: "italic",
  },
  messageTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._5,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacingX._5,
    marginTop: 2,
  },
});
