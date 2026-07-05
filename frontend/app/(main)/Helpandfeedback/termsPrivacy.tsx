import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { scale, verticalScale } from "@/utils/styling";

const TermsPrivacy = () => {
  const { colors: themeColors } = useTheme();
  const { t } = useAppSettings();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  const Section = ({ title, content }: { title: string; content: string }) => (
    <View style={styles.contentSection}>
      <Typo size={16} fontWeight="700" style={styles.sectionTitle}>
        {title}
      </Typo>
      <Typo size={14} color={themeColors.neutral500} style={styles.sectionText}>
        {content}
      </Typo>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.white }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icons.CaretLeft size={scale(24)} color={themeColors.black} weight="bold" />
        </TouchableOpacity>
        <Typo size={20} fontWeight="700">{t("termsPrivacy") || "Legal"}</Typo>
        <View style={{ width: scale(40) }} />
      </View>

      {/* CUSTOM TAB SELECTOR */}
      <View style={styles.tabWrapper}>
        <View style={[styles.tabContainer, { backgroundColor: themeColors.neutral100 }]}>
          <TouchableOpacity 
            onPress={() => setActiveTab("terms")}
            style={[styles.tab, activeTab === "terms" && { backgroundColor: themeColors.white, ...styles.shadow }]}
          >
            <Typo fontWeight={activeTab === "terms" ? "700" : "500"} size={14}>
              {t("termsOfService") || "Terms"}
            </Typo>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab("privacy")}
            style={[styles.tab, activeTab === "privacy" && { backgroundColor: themeColors.white, ...styles.shadow }]}
          >
            <Typo fontWeight={activeTab === "privacy" ? "700" : "500"} size={14}>
              {t("privacyPolicy") || "Privacy"}
            </Typo>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBox}>
          <Typo size={12} color={themeColors.neutral400} fontWeight="600">
            {t("lastUpdated") || "LAST UPDATED"}: MAY 14, 2026
          </Typo>
        </View>

        {activeTab === "terms" ? (
          <View>
            <Section 
              title="1. Acceptance of Terms" 
              content="By accessing or using our service, you agree to be bound by these terms. If you disagree with any part of the terms, you may not access the service." 
            />
            <Section 
              title="2. User Accounts" 
              content="You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password." 
            />
            <Section 
              title="3. Intellectual Property" 
              content="The service and its original content, features, and functionality are and will remain the exclusive property of the company and its licensors." 
            />
          </View>
        ) : (
          <View>
            <Section 
              title="Data Collection" 
              content="We collect several different types of information for various purposes to provide and improve our service to you, including email, phone number, and usage data." 
            />
            <Section 
              title="End-to-End Encryption" 
              content="Your messages are secured with end-to-end encryption. This means only you and the person you're communicating with can read what is sent." 
            />
            <Section 
              title="Third-Party Services" 
              content="We may employ third-party companies and individuals to facilitate our service, provide service on our behalf, or perform service-related services." 
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TermsPrivacy;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingX._20,
    paddingVertical: spacingY._15,
  },
  backButton: { padding: scale(8) },
  tabWrapper: {
    paddingHorizontal: spacingX._20,
    paddingBottom: spacingY._15,
  },
  tabContainer: {
    flexDirection: 'row',
    height: verticalScale(46),
    borderRadius: radius._12,
    padding: 4,
  },
  tab: {
    flex: 1,
    borderRadius: radius._10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: spacingX._20,
    paddingBottom: verticalScale(40),
  },
  infoBox: {
    marginBottom: spacingY._20,
    marginTop: spacingY._5,
  },
  contentSection: {
    marginBottom: spacingY._25,
  },
  sectionTitle: {
    marginBottom: spacingY._7,
  },
  sectionText: {
    lineHeight: 22,
  },
});