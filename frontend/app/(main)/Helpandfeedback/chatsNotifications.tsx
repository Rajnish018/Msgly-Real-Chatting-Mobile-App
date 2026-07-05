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


const ChatsNotifications = () => {
  const { colors: themeColors } = useTheme();
  const { t } = useAppSettings();
  const router = useRouter();
  
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const notificationArticles = [
    {
      title: t("notifDelayTitle") || "Why am I getting delayed push notifications?",
      content: t("notifDelayContent") || "Delayed incoming alerts are usually caused by operating system aggressive battery optimizations. To resolve this, go to your phone settings, look for Msgly, and remove it from the battery optimizer list. Ensuring background app refreshing is switched ON will instantly clear up communication lag.",
    },
    {
      title: t("backupChatsTitle") || "How do I backup and restore my chat logs?",
      content: t("backupChatsContent") || "Msgly stores secure, end-to-end cloud backups. Inside your app settings, choose 'Chat Backups' and configure either an automatic daily sequence or execute an instant manual sync. When changing physical mobile hardware later, signing back into your verified profile will securely fetch and restore this data.",
    },
    {
      title: t("muteChatsTitle") || "Can I mute a single contact or group chat?",
      content: t("muteChatsContent") || "Yes. Simply open the chat conversion thread you want to quiet down, tap on the contact's top banner name, select 'Mute Notifications', and choose your preferred duration frame (8 Hours, 1 Week, or Always).",
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
        <Typo size={20} fontWeight="700">{t("chatsNotifications") || "Chats & Notifs"}</Typo>
        <View style={{ width: scale(40) }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HERO HEADER */}
        <View style={styles.heroSection}>
          <View style={[styles.bellBadge, { backgroundColor: themeColors.neutral100 }]}>
            <Icons.BellRinging size={scale(44)} color={themeColors.primary} weight="duotone" />
          </View>
          <Typo size={22} fontWeight="800" style={styles.heroTitle}>
            {t("chatSettingsCenter") || "Chats & Alerts Center"}
          </Typo>
          <Typo size={14} color={themeColors.neutral500} style={styles.heroSubtitle}>
            {t("chatsSubtitle") || "Troubleshoot background delivery issues, configure media download rules, and organize your real-time chat workspace logs."}
          </Typo>
        </View>

        {/* SECTION: FAQS */}
        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("chatsFaqs") || "CHAT & ALERT FREQUENTLY ASKED QUESTIONS"}
          </Typo>

          {notificationArticles.map((article, index) => {
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

        {/* SECTION: ACTION LINK SHORTCUTS */}
        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("chatShortcuts") || "QUICK CHAT SHORTCUTS"}
          </Typo>

          <View style={[styles.actionWrapper, { backgroundColor: themeColors.neutral100 }]}>
            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => router.push("/(main)/home")}
            >
              <Icons.SpeakerHigh size={scale(20)} color={themeColors.neutral600} style={{ marginRight: scale(12) }} />
              <Typo size={14} fontWeight="600" style={{ flex: 1 }}>{t("configureAlerts") || "Configure Notification Sounds"}</Typo>
              <Icons.ArrowRight size={scale(16)} color={themeColors.neutral400} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: themeColors.neutral200 }]} />

            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => router.push("/(main)/home")}
            >
              <Icons.CloudArrowUp size={scale(20)} color={themeColors.neutral600} style={{ marginRight: scale(12) }} />
              <Typo size={14} fontWeight="600" style={{ flex: 1 }}>{t("manageCloudBackups") || "Manage Cloud Backups"}</Typo>
              <Icons.ArrowRight size={scale(16)} color={themeColors.neutral400} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default ChatsNotifications;

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
  bellBadge: {
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