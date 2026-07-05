import React, { useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Button from "@/components/Button";
import Input from "@/components/Input";
import Typo from "@/components/Typo";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { changeEmailAddress } from "@/services/authService";
import { scale, verticalScale } from "@/utils/styling";

const ChangeEmail = () => {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { t, emailAddress, refreshSettings } = useAppSettings();
  const { token, updateToken } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const emailRef = useRef("");
  const passwordRef = useRef("");

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSave = async () => {
    const newEmail = emailRef.current.trim();
    const currentPassword = passwordRef.current.trim();

    if (!newEmail || !currentPassword) {
      Alert.alert(t("error") || "Error", t("fillAllFields") || "Please fill in all fields");
      return;
    }

    if (!validateEmail(newEmail)) {
      Alert.alert(t("error") || "Error", t("invalidEmail") || "Please enter a valid email address");
      return;
    }

    if (!token) return;

    try {
      setLoading(true);
      const response = await changeEmailAddress(token, {
        newEmail,
        currentPassword,
      });

      if (!response?.success) {
        throw new Error(response?.msg || t("somethingWentWrong"));
      }

      if (response?.data?.token) {
        await updateToken(response.data.token);
      }
      
      await refreshSettings();
      Alert.alert(
        t("success") || "Success", 
        response?.msg || "Email updated successfully"
      );
      router.back();
    } catch (error: any) {
      Alert.alert(
        t("emailAddress") || "Email address", 
        error?.message || t("somethingWentWrong")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.white }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: themeColors.neutral100 }]}
          >
            <Icons.CaretLeft size={scale(22)} color={themeColors.black} weight="bold" />
          </TouchableOpacity>
          <Typo size={18} fontWeight="700">
            {t("changeEmail") || "Change Email"}
          </Typo>
          <View style={{ width: scale(40) }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current Email Info Card */}
          <View style={[styles.card, { backgroundColor: themeColors.neutral100 }]}>
            <Typo size={13} color={themeColors.neutral500} fontWeight="500">
              {t("currentEmail") || "Current email"}
            </Typo>
            <Typo size={16} fontWeight="600">
              {emailAddress || "Not set"}
            </Typo>
          </View>

          <View style={styles.form}>
            <Typo size={15} fontWeight="600" style={{ marginBottom: spacingY._5 }}>
              {t("newEmailDetails") || "New Email Details"}
            </Typo>
            
            <Input
              placeholder={t("newEmailPlaceholder") || "New email address"}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={(value) => (emailRef.current = value)}
              icon={<Icons.EnvelopeSimple size={20} color={themeColors.neutral400} />}
            />
            
            <Input
              placeholder={t("currentPassword") || "Current Password"}
              secureTextEntry
              onChangeText={(value) => (passwordRef.current = value)}
              icon={<Icons.Lock size={20} color={themeColors.neutral400} />}
            />
          </View>

          <View style={styles.footer}>
            <Button loading={loading} onPress={handleSave}>
              <Typo color={themeColors.white} fontWeight="700">
                {t("saveChanges") || "Save Changes"}
              </Typo>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChangeEmail;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingX._20,
    paddingVertical: spacingY._15,
  },
  backButton: {
    padding: scale(10),
    borderRadius: radius._12,
  },
  content: {
    paddingHorizontal: spacingX._20,
    paddingTop: spacingY._10,
    paddingBottom: verticalScale(40),
  },
  card: {
    borderRadius: radius._15,
    padding: spacingX._15,
    marginBottom: spacingY._25,
  },
  form: {
    gap: spacingY._15,
  },
  footer: {
    marginTop: spacingY._30,
  }
});