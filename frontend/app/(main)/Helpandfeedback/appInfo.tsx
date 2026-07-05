import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { scale, verticalScale } from "@/utils/styling";
import { bulid,developer } from "@/constants";

const BRAND_LOGO = require("@/assets/images/App-Logo.png");

const AppInfo = () => {
  const { colors: themeColors } = useTheme();
  const { t } = useAppSettings();
  const router = useRouter();

  // In production, these usually come from your app.json or a versioning file
  const appDetails = {
    name: Constants.expoConfig?.name || "Msgly",
    version:Constants.expoConfig?.version || "1.0.4",
    build: bulid || "2026.05.14",
    developer: developer || "R & R Labs",
  };

  const handleWebsitePress = () => {
    Linking.openURL("https://example.com");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.white }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icons.CaretLeft size={scale(24)} color={themeColors.black} weight="bold" />
        </TouchableOpacity>
        <Typo size={20} fontWeight="700">{t("appInfo") || "App Info"}</Typo>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* BRANDING SECTION */}
        <View style={styles.brandingContainer}>
          {/* Background color removed here so the transparent yellow logo renders cleanly */}
          <View style={styles.logoPlaceholder}>
            {BRAND_LOGO ? (
              <Image source={BRAND_LOGO} style={styles.logoImage} />
            ) : (
              <Icons.AppleLogoIcon size={scale(40)} color={themeColors.primary} />
            )}
          </View>
          <Typo size={24} fontWeight="800" style={styles.appName}>
            {appDetails.name}
          </Typo>
          <Typo size={14} color={themeColors.neutral500}>
            {t("version") || "Version"} {appDetails.version} ({appDetails.build})
          </Typo>
        </View>

        {/* DETAILS LIST */}
        <View style={[styles.infoCard, { backgroundColor: themeColors.neutral100 }]}>
          <View style={styles.infoRow}>
            <Typo size={14} color={themeColors.neutral500}>{t("developer") || "Developer"}</Typo>
            <Typo size={14} fontWeight="600">{appDetails.developer}</Typo>
          </View>
          
          <View style={[styles.separator, { backgroundColor: themeColors.neutral200 }]} />
          
          <TouchableOpacity style={styles.infoRow} onPress={handleWebsitePress}>
            <Typo size={14} color={themeColors.neutral500}>{t("website") || "Website"}</Typo>
            <View style={styles.rowRight}>
              <Typo size={14} color={themeColors.primary} fontWeight="600">visit site</Typo>
              <Icons.ArrowSquareOut size={scale(16)} color={themeColors.primary} style={{marginLeft: 4}} />
            </View>
          </TouchableOpacity>

          <View style={[styles.separator, { backgroundColor: themeColors.neutral200 }]} />

          <View style={styles.infoRow}>
            <Typo size={14} color={themeColors.neutral500}>{t("status") || "Status"}</Typo>
            {/* Kept fallback color intact or you can swap with themeColors.primary */}
            <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
              <Typo size={12} color={colors.white} fontWeight="700">STABLE</Typo>
            </View>
          </View>
        </View>

        {/* SECONDARY INFO */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push("/(main)/Helpandfeedback/termsPrivacy")}>
            <Typo size={14} color={themeColors.primary} fontWeight="600" style={styles.footerLink}>
              {t("licenses") || "Third-Party Licenses"}
            </Typo>
          </TouchableOpacity>
          
          <Typo size={12} color={themeColors.neutral400} style={styles.copyright}>
            © 2026 {appDetails.developer}. {t("allRightsReserved") || "All rights reserved."}
          </Typo>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default AppInfo;

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
  scrollContent: {
    paddingHorizontal: spacingX._20,
    alignItems: "center",
    paddingTop: verticalScale(30),
    paddingBottom: verticalScale(40),
  },
  brandingContainer: {
    alignItems: "center",
    marginBottom: verticalScale(40),
  },
  logoPlaceholder: {
    width: scale(100),
    height: scale(100),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacingY._15,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  appName: {
    marginBottom: 4,
  },
  infoCard: {
    width: "100%",
    borderRadius: radius._20,
    paddingHorizontal: spacingX._20,
    marginBottom: verticalScale(30),
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacingY._17,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  separator: {
    height: 1,
    width: "100%",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius._6,
  },
  footerLinks: {
    alignItems: "center",
  },
  footerLink: {
    marginBottom: spacingY._15,
  },
  copyright: {
    textAlign: "center",
  },
});