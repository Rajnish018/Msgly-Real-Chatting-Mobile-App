import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { scale, verticalScale } from "@/utils/styling";

const HelpAndFeedbackPage = () => {
  const { colors: themeColors } = useTheme();
  const { t } = useAppSettings();
  const router = useRouter();

  // Local crash-proof version of the SettingItem layout engine
  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    value, 
    onPress, 
    color = themeColors.black,
    showBorder = true
  }: any) => {
    const ValidIcon = icon || Icons.CircleIcon;

    return (
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={onPress} 
        disabled={!onPress}
        style={[styles.item, { borderBottomColor: themeColors.neutral200 }, !showBorder && { borderBottomWidth: 0 }]}
      >
        <View style={styles.itemLeft}>
          <View style={styles.iconContainer}>
            <ValidIcon size={scale(22)} color={color} weight="regular" />
          </View>
          <View style={styles.textContainer}>
            <Typo size={16} fontWeight="500" color={color}>{title}</Typo>
            {subtitle && (
              <Typo size={13} color={themeColors.neutral500} style={styles.subtitle}>
                {subtitle}
              </Typo>
            )}
          </View>
        </View>
        
        <View style={styles.itemRight}>
          {value && <Typo color={themeColors.neutral500} size={14}>{value}</Typo>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.white }]}>
      {/* HEADER CONTAINER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: themeColors.neutral100 }]}>
          <Icons.CaretLeft size={scale(24)} color={themeColors.black} weight="bold" />
        </TouchableOpacity>
        <Typo size={20} fontWeight="700">{t("helpfeedback") || "Help & Feedback"}</Typo>
        <View style={{ width: scale(40) }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* SUPPORT SECTION */}
        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("support") || "SUPPORT"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem 
              icon={Icons.Question} 
              title={t("helpCenter") || "Help Center"} 
              subtitle={t("helpCenterSubtitle") || "Get help, contact us"}
              onPress={() => router.push("/(main)/Helpandfeedback/helpCenter")} 
            />
            <SettingItem 
              icon={Icons.ChatTeardropText} 
              title={t("sendFeedback") || "Send Feedback"} 
              subtitle={t("sendFeedbackSubtitle") || "Report technical issues"}
              onPress={() => router.push("/(main)/Helpandfeedback/feedbackForm")} 
              showBorder={false}
            />
          </View>
        </View>

        {/* LEGAL & INFO SECTION */}
        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("legal") || "LEGAL & INFO"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem 
              icon={Icons.FileText} 
              title={t("termsPrivacyPolicy") || "Terms and Privacy Policy"} 
              onPress={() => router.push("/(main)/Helpandfeedback/termsPrivacy")} 
            />
            <SettingItem 
              icon={Icons.Info} 
              title={t("appInfo") || "App Info"} 
              value="v1.0.4"
              onPress={() => router.push("/(main)/Helpandfeedback/appInfo")} 
              showBorder={false}
            />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default HelpAndFeedbackPage;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingX._20,
    paddingVertical: spacingY._15,
  },
  backButton: {
    backgroundColor: colors.neutral100,
    padding: scale(8),
    borderRadius: radius._10,
  },
  scrollContent: { paddingHorizontal: spacingX._20, paddingBottom: verticalScale(40) },
  section: { marginBottom: spacingY._20 },
  sectionLabel: { marginBottom: spacingY._10, marginLeft: spacingX._5, letterSpacing: 1 },
  sectionBody: {
    backgroundColor: colors.neutral100,
    borderRadius: radius._15,
    paddingHorizontal: spacingX._15,
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
  subtitle: {
    marginTop: scale(2),
  },
  iconContainer: { padding: scale(4) },
  itemRight: { flexDirection: "row", alignItems: "center" },
});