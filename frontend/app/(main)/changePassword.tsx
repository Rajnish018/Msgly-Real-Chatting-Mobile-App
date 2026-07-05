import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Button from "@/components/Button";
import Input from "@/components/Input";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAuth } from "@/context/authContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { useTheme } from "@/context/themeContext";
import { changePassword } from "@/services/authService";
import { scale, verticalScale } from "@/utils/styling";

const ChangePasswordPage = () => {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { t } = useAppSettings();
  const { token, updateToken } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!token) return;

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert(t("changePassword"), t("fillAllFields"));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t("changePassword"), t("passwordMismatch"));
      return;
    }

    if (newPassword.trim().length < 6) {
      Alert.alert(t("changePassword"), t("passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      const response = await changePassword(token, {
        currentPassword,
        newPassword,
      });

      if (!response?.success) {
        throw new Error(response?.msg || t("somethingWentWrong"));
      }

      if (response?.token) {
        await updateToken(response.token);
      }

      Alert.alert(t("changePassword"), response?.msg || t("passwordUpdated"), [
        {
          text: t("ok"),
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert(t("changePassword"), error?.message || t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
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
          {t("changePassword")}
        </Typo>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.card, { backgroundColor: themeColors.neutral100 }]}>
          <View style={[styles.iconWrap, { backgroundColor: themeColors.white }]}>
            <Icons.Password size={scale(26)} color={themeColors.primary} weight="duotone" />
          </View>

          <Typo size={22} fontWeight="700">
            {t("secureYourAccount")}
          </Typo>
          <Typo size={14} color={themeColors.neutral500} style={styles.subtitle}>
            {t("changePasswordHelp")}
          </Typo>

          <View style={styles.form}>
            <Input
              placeholder={t("currentPassword")}
              secureTextEntry
              autoCapitalize="none"
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <Input
              placeholder={t("newPassword")}
              secureTextEntry
              autoCapitalize="none"
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <Input
              placeholder={t("confirmNewPassword")}
              secureTextEntry
              autoCapitalize="none"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <Button
            onPress={handleSubmit}
            loading={loading}
            style={styles.button}
          >
            <Typo color={themeColors.white} fontWeight="700">
              {t("saveChanges")}
            </Typo>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChangePasswordPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
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
    paddingBottom: verticalScale(40),
  },
  card: {
    borderRadius: radius._20,
    padding: spacingX._20,
    gap: spacingY._15,
    marginTop: spacingY._10,
  },
  iconWrap: {
    width: scale(54),
    height: scale(54),
    borderRadius: radius._15,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    lineHeight: verticalScale(20),
  },
  form: {
    gap: spacingY._12,
    marginTop: spacingY._5,
  },
  button: {
    marginTop: spacingY._10,
  },
});
