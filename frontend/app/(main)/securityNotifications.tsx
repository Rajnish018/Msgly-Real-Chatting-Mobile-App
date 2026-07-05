import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import SettingItem from "@/components/SettingItem";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useTheme } from "@/context/themeContext";
import { scale, verticalScale } from "@/utils/styling";

const SecurityNotifications = () => {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { settings, updateSettings } = useAppSettings();
  const securityNotifications = settings.account.securityNotifications;

  const toggle = async (
    key:
      | "loginAlerts"
      | "newDeviceAlerts"
      | "suspiciousActivityAlerts"
      | "emailChangeAlerts",
    value: boolean
  ) => {
    await updateSettings({
      account: {
        securityNotifications: {
          [key]: value,
        },
      },
    } as any);
  };

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
          Security Notifications
        </Typo>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
          <SettingItem
            icon={Icons.ShieldCheckered}
            title="Sign-in alerts"
            subtitle="Get notified when your account signs in on a device"
            isSwitch
            switchValue={securityNotifications.loginAlerts}
            onSwitchChange={(value) => toggle("loginAlerts", value)}
          />
          <SettingItem
            icon={Icons.DeviceMobile}
            title="New device alerts"
            subtitle="Alert me when a fresh device is linked to this account"
            isSwitch
            switchValue={securityNotifications.newDeviceAlerts}
            onSwitchChange={(value) => toggle("newDeviceAlerts", value)}
          />
          <SettingItem
            icon={Icons.WarningCircle}
            title="Suspicious activity"
            subtitle="Get a security notification for password and risk events"
            isSwitch
            switchValue={securityNotifications.suspiciousActivityAlerts}
            onSwitchChange={(value) => toggle("suspiciousActivityAlerts", value)}
          />
          <SettingItem
            icon={Icons.EnvelopeSimple}
            title="Email change alerts"
            subtitle="Send a notification whenever the account email changes"
            isSwitch
            switchValue={securityNotifications.emailChangeAlerts}
            onSwitchChange={(value) => toggle("emailChangeAlerts", value)}
            showBorder={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SecurityNotifications;

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
  },
  sectionBody: {
    backgroundColor: colors.neutral100,
    borderRadius: radius._15,
    paddingHorizontal: spacingX._15,
  },
});
