import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import SettingItem from "@/components/SettingItem";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useAuth } from "@/context/authContext";
import { useCustomAlert } from "@/context/customAlertContext";
import { useTheme } from "@/context/themeContext";
import { deleteMyAccount } from "@/services/authService";
import { scale, verticalScale } from "@/utils/styling";

const AccountSettings = () => {
  const { colors: themeColors } = useTheme();
  const { t, emailAddress, settings } = useAppSettings();
  const { token, logOut } = useAuth();
  const { showAlert } = useCustomAlert();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = () => {
    showAlert({
      title: t("deleteAccountTitle") || "Delete Account?",
      message:
        t("deleteAccountConfirm") ||
        "Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.",
      variant: "warning",
      buttons: [
        { text: t("cancel") || "Cancel", style: "cancel" },
        {
          text: isDeleting ? t("processing") || "Processing..." : t("delete") || "Delete",
          style: "destructive",
          onPress: async () => {
            if (!token || isDeleting) return;

            try {
              setIsDeleting(true);
              const response = await deleteMyAccount(token);
              if (!response?.success) {
                throw new Error(response?.msg || t("somethingWentWrong"));
              }
              await logOut();
            } catch (error: any) {
              showAlert({
                title: t("deleteAccount") || "Delete Account",
                message: error?.message || t("somethingWentWrong"),
                variant: "danger",
              });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    });
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
          {t("accountSettings") || "Account"}
        </Typo>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Typo
            size={13}
            color={themeColors.neutral400}
            fontWeight="600"
            style={styles.sectionLabel}
          >
            {t("securityAndContact")}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.ShieldCheckered}
              title={t("securityNotifications")}
              subtitle={`${Object.values(settings.account.securityNotifications).filter(Boolean).length}/4 enabled`}
              onPress={() => router.push("/(main)/securityNotifications")}
            />

            <SettingItem
              icon={Icons.EnvelopeSimple}
              title={t("emailAddress")}
              subtitle={emailAddress || "Not set"}
              onPress={() => router.push("/(main)/changeEmail")}
            />

            <SettingItem
              icon={Icons.DeviceMobile}
              title={t("twoStepVerification")}
              subtitle={
                settings.account.twoStepVerification.enabled
                  ? settings.account.twoStepVerification.hint || "Enabled"
                  : "Off"
              }
              onPress={() => router.push("/(main)/twoStepVerification")}
              showBorder={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Typo
            size={13}
            color={themeColors.neutral400}
            fontWeight="600"
            style={styles.sectionLabel}
          >
            {t("dangerZone")}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.Trash}
              title={t("deleteAccount")}
              subtitle={isDeleting ? t("processing") || "Processing..." : undefined}
              color={themeColors.rose || colors.rose}
              onPress={handleDeleteAccount}
              showBorder={false}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountSettings;

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
});
