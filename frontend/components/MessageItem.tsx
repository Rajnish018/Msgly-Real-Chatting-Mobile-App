import { View, StyleSheet} from "react-native";
import React from "react";
import { MessageProps } from "@/types";
import { useAuth } from "@/context/authContext";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import Avatar from "./Avatar";
import Typo from "./Typo";
import moment from "moment";
import { Image } from "expo-image";

const MessageItem = ({ item, isDirect }: { item: MessageProps; isDirect: boolean }) => {

  const { user: currentUser } = useAuth();

  const sender: any = item?.sender 
  const isMe = String(currentUser?.id) === String(sender?._id || sender?.id);

  const formattedDate = item?.createdAt
    ? moment(item.createdAt).isSame(moment(), "day")
      ? moment(item.createdAt).format("hh:mm A")
      : moment(item.createdAt).format("MMM D")
    : "";

  return (
    <View
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
          isMe ? styles.myBubble : styles.theirBubble,
        ]}
      >
        {/* sender name (only in group messages + not me) */}
        {!isMe && !isDirect && (
          <Typo size={13} color={colors.neutral500} fontWeight="600">
            {sender?.name || "User"}
          </Typo>
        )}

        {/* attachment preview */}
        {item?.attachment && (
          <Image
            source={{ uri: item.attachment }}
            contentFit="cover"
            style={styles.attachment}
            transition={100}
          />
        )}

        {/* message text */}
        {!!item?.content && (
          <Typo size={14} color={colors.black}>
            {item.content}
          </Typo>
        )}

        {/* time */}
        {!!item?.createdAt && (
          <Typo size={11} color={colors.neutral500} style={{ alignSelf: "flex-end" }}>
            {formattedDate}
          </Typo>
        )}
      </View>
    </View>
  );
};

export default MessageItem;

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: "row",
    gap: spacingX._7,
    maxWidth: "80%",
  },
  myMessage: {
    alignSelf: "flex-end",
  },
  theirMessage: {
    alignSelf: "flex-start",
  },
  messageAvatar: {
    alignSelf: "flex-end",
  },
  attachment: {
    height: verticalScale(180),
    width: verticalScale(180),
    borderRadius: radius._10,
  },
  messageBubble: {
    padding: spacingX._10,
    borderRadius: radius._15,
    gap: spacingY._5,
  },
  myBubble: {
    backgroundColor: colors.myBubble,
  },
  theirBubble: {
    backgroundColor: colors.otherBubble,
  },
});
