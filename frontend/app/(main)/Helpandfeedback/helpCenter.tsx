import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { scale, verticalScale } from "@/utils/styling";

const HelpCenter = () => {
  const { colors: themeColors } = useTheme();
  const { t } = useAppSettings();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { id: "getting_started", title: t("gettingStarted") || "Getting Started", icon: Icons.RocketLaunch },
    { id: "account_security", title: t("accountSecurity") || "Account & Security", icon: Icons.ShieldCheck },
    { id: "chats_notifications", title: t("chatsNotifications") || "Chats & Notifications", icon: Icons.ChatCircleDots },
    { id: "payments", title: t("payments") || "Payments & Billing", icon: Icons.CreditCard },
  ];

  const handleLiveChatPress = () => {
    router.push("/(main)/Helpandfeedback/liveChat"); 
  };

 const handleEmailPress = async () => {
  const email = "support@msgly.com";
  const subject = encodeURIComponent("Help Center Request");
  const body = encodeURIComponent("Hello Msgly Support Team,\n\n");

  // 1. Direct deep-link targeted for the Android Gmail compose layout
  const gmailUrl = `googlegmail://co?to=${email}&subject=${subject}&body=${body}`;
  
  // 2. Production fallback using standard RFC mailto specification
  const standardMailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

  try {
    // Attempt direct high-speed routing straight into the Gmail app
    await Linking.openURL(gmailUrl);
  } catch (gmailError) {
    /* FALLBACK LAYER: If the direct Gmail scheme fails (e.g., app disabled,
      uninstalled, or system restrictions block the custom scheme), 
      we fire the standard system protocol.
    */
    try {
      await Linking.openURL(standardMailtoUrl);
    } catch (systemError) {
      // DEFENSIVE SAFEGUARD: Triggered if absolutely no mailing infrastructure exists
      Alert.alert(
        "Communication Error",
        "We couldn't open a mailing app automatically. Please drop us a line manually at support@msgly.com.",
        [{ text: "OK", style: "default" }]
      );
    }
  }
};

  // Maps every single card to its own specialized layout target
  const handleCategoryPress = (categoryId: string) => {
    switch (categoryId) {
      case "getting_started":
        router.push("/(main)/Helpandfeedback/gettingStarted");
        break;
      case "account_security":
        router.push("/(main)/Helpandfeedback/accountSecurity");
        break;
      case "chats_notifications":
        router.push("/(main)/Helpandfeedback/chatsNotifications");
        break;
      case "payments":
        router.push("/(main)/Helpandfeedback/paymentsBilling");
        break;
      default:
        break;
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Typo size={20} fontWeight="700">{t("helpCenter") || "Help Center"}</Typo>
        <View style={{ width: scale(40) }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HERO SEARCH */}
        <View style={styles.heroSection}>
          <Typo size={24} fontWeight="800" style={styles.heroTitle}>
            {t("howCanWeHelp") || "How can we help?"}
          </Typo>
          <View style={[styles.searchContainer, { backgroundColor: themeColors.neutral100 }]}>
            <Icons.MagnifyingGlass size={scale(20)} color={themeColors.neutral500} />
            <TextInput
              placeholder={t("searchPlaceholder") || "Describe your issue..."}
              placeholderTextColor={themeColors.neutral400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: themeColors.black }]}
            />
          </View>
        </View>

        {/* CATEGORIES GRID */}
        <View style={styles.section}>
          <View style={styles.grid}>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.gridCard, { backgroundColor: themeColors.neutral100 }]}
                  onPress={() => handleCategoryPress(cat.id)}
                >
                  <cat.icon size={scale(28)} color={themeColors.primary} weight="duotone" />
                  <Typo size={14} fontWeight="600" style={styles.gridText}>{cat.title}</Typo>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noResultsContainer}>
                <Typo size={14} color={themeColors.neutral500}>No matching topics found.</Typo>
              </View>
            )}
          </View>
        </View>

        {/* CONTACT SECTION */}
        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("otherWays") || "OTHER WAYS TO CONNECT"}
          </Typo>
          
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <TouchableOpacity style={styles.contactRow} onPress={handleEmailPress}>
              <View style={[styles.contactIcon, { backgroundColor: '#E3F2FD' }]}>
                <Icons.Envelope size={scale(20)} color="#1976D2" />
              </View>
              <View style={{ flex: 1, marginLeft: scale(12) }}>
                <Typo fontWeight="600">{t("emailUs") || "Email Us"}</Typo>
                <Typo size={12} color={themeColors.neutral500}>support@msgly.com</Typo>
              </View>
              <Icons.CaretRight size={scale(18)} color={themeColors.neutral400} />
            </TouchableOpacity>

            <View style={[styles.separator, { backgroundColor: themeColors.neutral200 }]} />

            <TouchableOpacity style={styles.contactRow} onPress={handleLiveChatPress}>
              <View style={[styles.contactIcon, { backgroundColor: '#F3E5F5' }]}>
                <Icons.ChatCircleText size={scale(20)} color="#7B1FA2" />
              </View>
              <View style={{ flex: 1, marginLeft: scale(12) }}>
                <Typo fontWeight="600">{t("liveChat") || "Live Chat"}</Typo>
                <Typo size={12} color={themeColors.neutral500}>{t("typicalWait") || "Wait time: 5 mins"}</Typo>
              </View>
              <Icons.CaretRight size={scale(18)} color={themeColors.neutral400} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default HelpCenter;

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
    marginBottom: spacingY._25,
  },
  heroTitle: {
    marginBottom: spacingY._15,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacingX._15,
    height: verticalScale(50),
    borderRadius: radius._15,
  },
  searchInput: {
    flex: 1,
    marginLeft: scale(10),
    fontSize: scale(15),
  },
  section: { marginBottom: spacingY._25 },
  sectionLabel: { 
    marginBottom: spacingY._10, 
    marginLeft: spacingX._5, 
    letterSpacing: 1 
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  gridCard: {
    width: '48%',
    padding: scale(20),
    borderRadius: radius._20,
    marginBottom: spacingY._15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridText: {
    marginTop: scale(10),
    textAlign: 'center',
  },
  noResultsContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: verticalScale(20),
  },
  sectionBody: {
    borderRadius: radius._20,
    paddingHorizontal: spacingX._15,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingY._15,
  },
  contactIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: radius._12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    width: '100%',
  }
});