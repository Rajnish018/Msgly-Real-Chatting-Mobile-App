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
import { radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { scale, verticalScale } from "@/utils/styling";

const GettingStarted = () => {
  const { colors: themeColors } = useTheme();
  const { t } = useAppSettings();
  const router = useRouter();

  // FIXED: Changed UsersRoaming to Users, ensuring valid object exports
  const steps = [
    {
      number: "1",
      title: t("stepCreateAccount") || "Create Your Account",
      description: t("stepCreateAccountDesc") || "Sign up using your phone number or email address. Verify your identity with the one-time OTP secure code.",
      icon: Icons.UserPlus,
    },
    {
      number: "2",
      title: t("stepCompleteProfile") || "Set Up Your Profile",
      description: t("stepCompleteProfileDesc") || "Upload your display picture, pick a unique chat username, and add a quick bio so your friends recognize you.",
      icon: Icons.IdentificationCard,
    },
    {
      number: "3",
      title: t("stepSyncContacts") || "Sync Your Contacts",
      description: t("stepSyncContactsDesc") || "Allow Msgly to scan your address book to automatically connect you with friends already using the platform.",
      icon: Icons.Users, 
    },
    {
      number: "4",
      title: t("stepStartChatting") || "Start Real-Time Chatting",
      description: t("stepStartChattingDesc") || "Tap the conversation floating button, pick a friend, and start sharing text, media assets, or encrypted voice notes instantly.",
      icon: Icons.PaperPlaneTilt,
    },
  ];

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
        <Typo size={20} fontWeight="700">{t("gettingStarted") || "Getting Started"}</Typo>
        <View style={{ width: scale(40) }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HERO TITLE */}
        <View style={styles.heroSection}>
          <Typo size={22} fontWeight="800" style={styles.heroTitle}>
            {t("welcomeToMsgly") || "Welcome to Msgly!"}
          </Typo>
          <Typo size={14} color={themeColors.neutral500} style={styles.heroSubtitle}>
            {t("gettingStartedSubtitle") || "Follow this quick 4-step deployment checklist to get your real-time chat workspace fully up and running."}
          </Typo>
        </View>

        {/* STEP SYSTEM LIST */}
        <View style={styles.stepsContainer}>
          {steps.map((item, index) => {
            const IconComponent = item.icon; // Assigned to capital variable for clean JSX parsing
            return (
              <View key={index} style={styles.stepWrapper}>
                {/* Step Timeline Indicator Visuals */}
                <View style={styles.timelineColumn}>
                  <View style={[styles.stepBadge, { backgroundColor: themeColors.primary }]}>
                    <Typo size={12} color="white" fontWeight="800">{item.number}</Typo>
                  </View>
                  {index !== steps.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: themeColors.neutral200 }]} />
                  )}
                </View>

                {/* Step Dynamic Card Contents */}
                <View style={[styles.stepCard, { backgroundColor: themeColors.neutral100 }]}>
                  <View style={styles.cardHeader}>
                    {IconComponent && (
                      <IconComponent size={scale(20)} color={themeColors.primary} weight="duotone" style={{ marginRight: scale(8) }} />
                    )}
                    <Typo size={15} fontWeight="700" style={{ flex: 1 }}>{item.title}</Typo>
                  </View>
                  <Typo size={13} color={themeColors.neutral500} style={styles.stepDescription}>
                    {item.description}
                  </Typo>
                </View>
              </View>
            );
          })}
        </View>

        {/* BOTTOM ACTION CTA */}
        <TouchableOpacity 
          style={[styles.primaryButton, { backgroundColor: themeColors.primary }]}
          onPress={() => router.replace("/(main)/home")}
        >
          <Typo size={15} fontWeight="700" color="white">
            {t("goToChats") || "Open My Workspace"}
          </Typo>
          <Icons.ArrowRight size={scale(18)} color="white" weight="bold" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default GettingStarted;

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
    marginTop: spacingY._15,
    marginBottom: spacingY._30,
    alignItems: 'center',
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
  stepsContainer: {
    marginBottom: spacingY._30,
  },
  stepWrapper: {
    flexDirection: 'row',
    marginBottom: spacingY._10,
  },
  timelineColumn: {
    alignItems: 'center',
    marginRight: scale(12),
  },
  stepBadge: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepCard: {
    flex: 1,
    borderRadius: radius._15,
    padding: scale(16),
    marginBottom: spacingY._12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingY._5,
  },
  stepDescription: {
    lineHeight: scale(18),
  },
  primaryButton: {
    flexDirection: 'row',
    height: verticalScale(52),
    borderRadius: radius._15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginTop: spacingY._10,
  }
});