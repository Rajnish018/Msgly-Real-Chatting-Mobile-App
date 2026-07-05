import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { scale, verticalScale } from "@/utils/styling";

// Enable LayoutAnimation for Android smoothly animating accordion collapses

const AccountSecurity = () => {
  const { colors: themeColors } = useTheme();
  const { t } = useAppSettings();
  const router = useRouter();
  
  // Track open states for help accordions
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const securityArticles = [
    {
      title: t("howToChangePassword") || "How do I change my account password?",
      content: t("changePasswordDetails") || "Navigate back to the main Profile Settings workspace menu, select 'Privacy & Security', then tap 'Update Password'. You will need to verify your current security credentials before confirming your new password layout entry update.",
    },
    {
      title: t("whatIs2FA") || "Enabling Two-Factor Authentication (2FA)",
      content: t("enable2FADetails") || "Msgly strongly recommends activating 2FA to keep chat vaults isolated. Go into your profile configurations, select 'Security Settings', toggle '2FA Authentication', and link up your preferred authenticator engine (Google Authenticator, Microsoft Auth) or set up text-fallback verification tokens.",
    },
    {
      title: t("recognizedDevices") || "Managing Active Login Sessions",
      content: t("recognizedDevicesDetails") || "Under your Account Management dashboard panel, you can access an end-to-end list displaying every mobile device or computer currently signed into your Msgly chat profile context. If you notice strange activities, tap 'Revoke Session' to log out of remote devices instantly.",
    }
  ];

  const toggleAccordion = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.white }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: themeColors.neutral100 }]}
        >
          <Icons.CaretLeft size={scale(24)} color={themeColors.black} weight="bold" />
        </TouchableOpacity>
        <Typo size={20} fontWeight="700">{t("accountSecurity") || "Account & Security"}</Typo>
        <View style={{ width: scale(40) }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* TOP HERO INSIGHT SYSTEM */}
        <View style={styles.heroSection}>
          <View style={[styles.shieldBadge, { backgroundColor: themeColors.neutral100 }]}>
            <Icons.ShieldCheck size={scale(44)} color={themeColors.primary} weight="duotone" />
          </View>
          <Typo size={22} fontWeight="800" style={styles.heroTitle}>
            {t("securityCenter") || "Security Control Center"}
          </Typo>
          <Typo size={14} color={themeColors.neutral500} style={styles.heroSubtitle}>
            {t("securitySubtitle") || "Learn how Msgly keeps your end-to-end conversations, private database files, and account authorization sessions locked down."}
          </Typo>
        </View>

        {/* SECTION: COMMON ARTICLES */}
        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("securityFaqs") || "SECURITY FREQUENTLY ASKED QUESTIONS"}
          </Typo>

          {securityArticles.map((article, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <View key={index} style={[styles.accordionCard, { backgroundColor: themeColors.neutral100 }]}>
                <TouchableOpacity 
                  style={styles.accordionHeader} 
                  onPress={() => toggleAccordion(index)}
                  activeOpacity={0.7}
                >
                  <Typo size={15} fontWeight="700" style={{ flex: 1, paddingRight: scale(8) }}>
                    {article.title}
                  </Typo>
                  <View style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}>
                    <Icons.CaretDown size={scale(18)} color={themeColors.neutral500} weight="bold" />
                  </View>
                </TouchableOpacity>
                
                {isExpanded && (
                  <View style={styles.accordionBody}>
                    <View style={[styles.divider, { backgroundColor: themeColors.neutral200 }]} />
                    <Typo size={13} color={themeColors.neutral500} style={styles.articleText}>
                      {article.content}
                    </Typo>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* SECTION: ACTION LINKS */}
        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("quickActions") || "QUICK ACCOUNT CONTEXT SHORTCUTS"}
          </Typo>

          <View style={[styles.actionWrapper, { backgroundColor: themeColors.neutral100 }]}>
            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => router.push("/(main)/home")} // Adjust this path link context to point to your specific configurations nested tree
            >
              <Icons.LockKey size={scale(20)} color={themeColors.neutral600} style={{ marginRight: scale(12) }} />
              <Typo size={14} fontWeight="600" style={{ flex: 1 }}>{t("updatePrivacySettings") || "Update Privacy Settings"}</Typo>
              <Icons.ArrowRight size={scale(16)} color={themeColors.neutral400} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: themeColors.neutral200 }]} />

            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => router.push("/(main)/home")}
            >
              <Icons.Devices size={scale(20)} color={themeColors.neutral600} style={{ marginRight: scale(12) }} />
              <Typo size={14} fontWeight="600" style={{ flex: 1 }}>{t("terminateOtherSessions") || "Terminate Active Sessions"}</Typo>
              <Icons.ArrowRight size={scale(16)} color={themeColors.neutral400} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountSecurity;

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
  scrollContent: { 
    paddingHorizontal: spacingX._20, 
    paddingBottom: verticalScale(40) 
  },
  heroSection: {
    marginTop: spacingY._10,
    marginBottom: spacingY._30,
    alignItems: 'center',
  },
  shieldBadge: {
    width: scale(80),
    height: scale(80),
    borderRadius: radius._20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingY._15,
  },
  heroTitle: {
    marginBottom: spacingY._7,
    textAlign: 'center',
  },
  heroSubtitle: {
    textAlign: 'center',
    lineHeight: scale(20),
    paddingHorizontal: spacingX._10,
  },
  section: { 
    marginBottom: spacingY._25 
  },
  sectionLabel: { 
    marginBottom: spacingY._12, 
    marginLeft: spacingX._5, 
    letterSpacing: 0.8 
  },
  accordionCard: {
    borderRadius: radius._15,
    marginBottom: spacingY._12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(16),
  },
  accordionBody: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
  },
  divider: {
    height: 1,
    width: '100%',
  },
  articleText: {
    marginTop: scale(12),
    lineHeight: scale(18),
  },
  actionWrapper: {
    borderRadius: radius._15,
    paddingHorizontal: scale(16),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingY._15,
  }
});