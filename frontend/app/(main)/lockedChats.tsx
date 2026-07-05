import React, { useMemo, useState } from "react";
import { 
  ScrollView, 
  StatusBar, 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  TouchableWithoutFeedback 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import ConversationItem from "@/components/ConversationItem";
import Typo from "@/components/Typo";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { ConversationProps } from "@/types";
import { scale, verticalScale } from "@/utils/styling";

interface ThemeColors {
  background?: string;
  white: string;
  text: string;
  neutral100: string;
  neutral200?: string;
  neutral300: string;
  neutral500: string;
  neutral700: string;
  [key: string]: string | undefined; 
}

const LockedChats = () => {
  const router = useRouter();
  const { conversations: rawConversations } = useLocalSearchParams<{ conversations: string }>();
  
  const { colors, isDark } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Safe parsing of incoming chat array params
  const conversations = useMemo<ConversationProps[]>(() => {
    if (!rawConversations) return [];
    try {
      const targetStr = Array.isArray(rawConversations) ? rawConversations[0] : rawConversations;
      return JSON.parse(targetStr);
    } catch (error) {
      console.error("Failed to parse locked conversations:", error);
      return [];
    }
  }, [rawConversations]);

  const handleHideChat = () => {
    setMenuVisible(false);
    // TODO: Implement your logic to toggle visibility/hide layout here
    console.log("Hide Chat action triggered");
  };

  const handleLockSettings = () => {
    setMenuVisible(false);
    // TODO: Route to custom password settings or open change-password sheets here
    console.log("Chat Lock Settings action triggered");
  };

  return (
    <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Icons.CaretLeft size={scale(24)} color={colors.text} weight="bold" />
          </TouchableOpacity>
          
          <Typo size={20} fontWeight="700" color={colors.text}>
            Locked chats
          </Typo>
          
          {/* Action Menu Anchor Button */}
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => setMenuVisible((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Icons.DotsThreeVertical
              size={scale(22)}
              color={colors.text}
              weight="bold"
            />
          </TouchableOpacity>

          {/* Floating Dropdown Popover */}
          {menuVisible && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleHideChat}
                activeOpacity={0.6}
              >
                {/* <Icons.EyeSlash size={scale(18)} color={colors.text} /> */}
                <Typo size={14} fontWeight="500" color={colors.text}>
                  Hide chat
                </Typo>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />

              <TouchableOpacity 
                style={styles.menuItem} 
                onPress={handleLockSettings}
                activeOpacity={0.6}
              >
                {/* <Icons.GearSix size={scale(18)} color={colors.text} /> */}
                <Typo size={14} fontWeight="500" color={colors.text}>
                  Chat lock settings
                </Typo>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Content Stream */}
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {conversations.length > 0 ? (
            conversations.map((item, index) => (
              <ConversationItem
                key={item._id || `locked-chat-${index}`}
                item={item}
                router={router}
                showDivider={index !== conversations.length - 1}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icons.LockKey size={scale(58)} color={colors.neutral300} weight="thin" />
              <Typo color={colors.neutral500} style={styles.emptyStateText}>
                No locked chats
              </Typo>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default React.memo(LockedChats);

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background || colors.white, 
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacingX._20,
      paddingVertical: spacingY._15,
      zIndex: 10, // Places dropdown above the content stream
    },
    backButton: {
      padding: scale(8),
      borderRadius: radius._10,
      backgroundColor: colors.neutral100,
    },
    moreButton: {
      padding: scale(8),
      borderRadius: radius._10,
      backgroundColor: colors.neutral100,
      justifyContent: "center",
      alignItems: "center",
    },
    dropdownMenu: {
      position: "absolute",
      top: verticalScale(60),
      right: spacingX._20,
      backgroundColor: colors.white,
      borderRadius: radius._12,
      width: scale(190),
      paddingVertical: spacingY._5,
      
      // Native Shadow/Depth properties
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 6,
      
      borderWidth: 1,
      borderColor: colors.neutral100,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(10),
      paddingHorizontal: spacingX._15,
      paddingVertical: spacingY._10,
    },
    menuDivider: {
      height: 1,
      backgroundColor: colors.neutral100,
      marginHorizontal: spacingX._12,
    },
    scrollContent: {
      paddingTop: spacingY._10,
      paddingBottom: verticalScale(90),
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      marginTop: verticalScale(120),
    },
    emptyStateText: {
      marginTop: spacingY._10,
    },
  });