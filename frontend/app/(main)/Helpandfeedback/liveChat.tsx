import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { scale, verticalScale } from "@/utils/styling";

interface Message {
  id: string;
  text: string;
  sender: "user" | "support";
  timestamp: string;
}

const LiveChat = () => {
  const { colors: themeColors } = useTheme();
  const { t } = useAppSettings();
  const router = useRouter();
  
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // Default initial welcome messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: t("chatWelcome") || "Hello there! Welcome to Msgly Live Support Workspace.",
      sender: "support",
      timestamp: "3:15 PM",
    },
    {
      id: "2",
      text: t("chatWelcomePrompt") || "How can we help optimize your real-time chat setup today?",
      sender: "support",
      timestamp: "3:15 PM",
    },
  ]);

  // Keep chat pinned to the bottom when updates hit the list array
  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessageId = Date.now().toString();

    const newUserMessage: Message = {
      id: userMessageId,
      text: inputText.trim(),
      sender: "user",
      timestamp: currentTime,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputText("");

    // Simulated auto-agent assistant response trigger sequence
    setTimeout(() => {
      const supportResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: t("supportAutomatedAck") || "Thanks for getting in touch! A support engineer from R & R Labs has been assigned and will connect shortly.",
        sender: "support",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, supportResponse]);
    }, 1200);
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";
    return (
      <View style={[styles.messageRow, isUser ? styles.rowUser : styles.rowSupport]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: themeColors.primary }]}>
            <Icons.Headset size={scale(16)} color="white" weight="bold" />
          </View>
        )}
        <View style={{ maxWidth: '75%' }}>
          <View 
            style={[
              styles.bubble, 
              isUser 
                ? [styles.bubbleUser, { backgroundColor: themeColors.primary }] 
                : [styles.bubbleSupport, { backgroundColor: themeColors.neutral100 }]
            ]}
          >
            <Typo size={14} color={isUser ? "white" : themeColors.black}>
              {item.text}
            </Typo>
          </View>
          <Typo size={10} color={themeColors.neutral400}  style={[styles.timestamp, isUser ? styles.timeUser : styles.timeSupport]}>
            {item.timestamp}
          </Typo>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.white }]} edges={['top', 'left', 'right']}>
      {/* HEADER BAR */}
      <View style={[styles.header, { borderBottomColor: themeColors.neutral100 }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: themeColors.neutral100 }]}
        >
          <Icons.CaretLeft size={scale(24)} color={themeColors.black} weight="bold" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Typo size={16} fontWeight="700">{t("liveChatTitle") || "Live Chat Support"}</Typo>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            <Typo size={12} color={themeColors.neutral500}>{t("supportOnline") || "Agent active"}</Typo>
          </View>
        </View>
        
        <View style={{ width: scale(40) }} /> 
      </View>

      {/* CHAT THREAD PORTAL */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? scale(12) : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.chatScroll}
          showsVerticalScrollIndicator={false}
        />

        {/* INPUT SHELF SYSTEM */}
        <SafeAreaView edges={['bottom']} style={[styles.inputBar, { borderTopColor: themeColors.neutral100, backgroundColor: themeColors.white }]}>
          <View style={[styles.inputContainer, { backgroundColor: themeColors.neutral100 }]}>
            <TextInput
              placeholder={t("typeSupportMessage") || "Type message here..."}
              placeholderTextColor={themeColors.neutral400}
              value={inputText}
              onChangeText={setInputText}
              multiline
              style={[styles.textInput, { color: themeColors.black }]}
            />
            <TouchableOpacity 
              style={[styles.sendButton, { backgroundColor: inputText.trim() ? themeColors.primary : themeColors.neutral300 }]}
              onPress={handleSendMessage}
              disabled={!inputText.trim()}
            >
              <Icons.PaperPlaneTilt size={scale(18)} color="white" weight="bold" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LiveChat;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingX._20,
    paddingVertical: spacingY._12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: scale(8),
    borderRadius: radius._10,
  },
  headerInfo: {
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  chatScroll: {
    paddingHorizontal: spacingX._20,
    paddingVertical: verticalScale(15),
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: spacingY._15,
    alignItems: 'flex-end',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowSupport: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(8),
    marginBottom: 4,
  },
  bubble: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: radius._15,
  },
  bubbleUser: {
    borderBottomRightRadius: radius._3,
  },
  bubbleSupport: {
    borderBottomLeftRadius: radius._3,
  },
  timestamp: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  timeUser: { textAlign: 'right' },
  timeSupport: { textAlign: 'left' },
  inputBar: {
    paddingHorizontal: spacingX._15,
    paddingVertical: spacingY._10,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius._20,
    paddingHorizontal: spacingX._12,
    paddingVertical: Platform.OS === 'ios' ? spacingY._7 : 0,
  },
  textInput: {
    flex: 1,
    fontSize: scale(14),
    maxHeight: verticalScale(80),
    paddingVertical: spacingY._7,
  },
  sendButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(8),
  },
});