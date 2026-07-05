import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useTheme } from "@/context/themeContext";
import { scale, verticalScale } from "@/utils/styling";

const PrivacyCheckup = () => {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { settings } = useAppSettings();
  const privacy = settings.privacy;

  const checklist = [
    {
      icon: Icons.ShieldCheckered,
      title: "Profile visibility",
      detail: privacy.privateProfile ? "Private profile is enabled" : "Your profile is publicly discoverable",
    },
    {
      icon: Icons.Eye,
      title: "Presence sharing",
      detail: privacy.showOnlineStatus ? "Online presence is visible" : "Online presence is hidden",
    },
    {
      icon: Icons.Checks,
      title: "Read receipts",
      detail: privacy.readReceipts ? "Read receipts are on" : "Read receipts are off",
    },
    {
      icon: Icons.Phone,
      title: "Call privacy",
      detail: privacy.protectIpInCalls
        ? "IP protection is enabled for calls"
        : "Direct call routing is still allowed",
    },
    {
      icon: Icons.AddressBook,
      title: "Blocked contacts",
      detail: `${privacy.blockedUserIds.length} blocked contact${privacy.blockedUserIds.length === 1 ? "" : "s"}`,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.white }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: themeColors.neutral100 }]}
        >
          <Icons.CaretLeft size={scale(24)} color={themeColors.black} weight="bold" />
        </TouchableOpacity>
        <Typo size={20} fontWeight="700">
          Privacy Checkup
        </Typo>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {checklist.map((item) => (
          <View
            key={item.title}
            style={[styles.card, { backgroundColor: themeColors.neutral100, borderColor: themeColors.neutral200 }]}
          >
            <item.icon size={24} color={themeColors.primary} weight="duotone" />
            <View style={styles.cardText}>
              <Typo size={16} fontWeight="700">
                {item.title}
              </Typo>
              <Typo size={13} color={themeColors.neutral500}>
                {item.detail}
              </Typo>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacyCheckup;

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
  content: {
    paddingHorizontal: spacingX._20,
    paddingBottom: verticalScale(40),
    gap: spacingY._12,
  },
  card: {
    borderRadius: radius._20,
    borderWidth: 1,
    padding: spacingX._16,
    flexDirection: "row",
    gap: spacingX._12,
    alignItems: "flex-start",
  },
  cardText: {
    flex: 1,
    gap: spacingY._4,
  },
});
