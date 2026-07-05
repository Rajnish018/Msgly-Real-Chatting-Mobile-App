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
import SettingItem from "@/components/SettingItem";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { updateTwoStepVerification as saveTwoStepVerification } from "@/services/authService";
import { scale, verticalScale } from "@/utils/styling";

const TwoStepVerification = () => {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { settings, refreshSettings, t } = useAppSettings(); // Added 't' for translations if available
  const { token } = useAuth();
  
  const twoStep = settings.account.twoStepVerification;
  const [enabled, setEnabled] = useState(twoStep.enabled);
  const [emailRecovery, setEmailRecovery] = useState(twoStep.emailRecovery);
  const [loading, setLoading] = useState(false);
  
  const pinRef = useRef("");
  const hintRef = useRef(twoStep.hint || "");
  const passwordRef = useRef("");

  const handleSave = async () => {
    if (!token) return;

    const currentPin = pinRef.current.trim();
    const currentPassword = passwordRef.current.trim();

    // Basic Validation
    if (enabled && currentPin.length > 0 && currentPin.length !== 6) {
      Alert.alert("Invalid PIN", "The verification PIN must be exactly 6 digits.");
      return;
    }

    if (!currentPassword) {
      Alert.alert("Required", "Please enter your current password to confirm changes.");
      return;
    }

    try {
      setLoading(true);
      const response = await saveTwoStepVerification(token, {
        enabled,
        pin: currentPin || undefined,
        hint: hintRef.current.trim() || undefined,
        emailRecovery,
        currentPassword,
      });

      if (!response?.success) {
        throw new Error(response?.msg || "Unable to update two-step verification");
      }

      await refreshSettings();
      Alert.alert("Two-step verification", response?.msg || "Updated successfully");
      router.back();
    } catch (error: any) {
      Alert.alert("Two-step verification", error?.message || "Something went wrong");
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
            Two-step Verification
          </Typo>
          <View style={{ width: scale(40) }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Switches Section */}
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.ShieldCheckered}
              title="Enable 6-digit PIN"
              subtitle="Require a PIN for sensitive actions"
              isSwitch
              switchValue={enabled}
              onSwitchChange={setEnabled}
            />
            <SettingItem
              icon={Icons.EnvelopeSimple}
              title="Email recovery"
              subtitle="Recovery for forgotten PINs"
              isSwitch
              switchValue={emailRecovery}
              onSwitchChange={setEmailRecovery}
              showBorder={false}
            />
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            <Typo size={15} fontWeight="600" style={{ marginBottom: spacingY._5 }}>
              Verification Details
            </Typo>
            
            <Input
              placeholder="New 6-digit PIN"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              onChangeText={(v) => (pinRef.current = v)}
              icon={<Icons.DeviceMobile size={20} color={themeColors.neutral400} />}
            />
            
            <Input
              placeholder="PIN Hint (optional)"
              defaultValue={twoStep.hint}
              onChangeText={(v) => (hintRef.current = v)}
              icon={<Icons.Lightbulb size={20} color={themeColors.neutral400} />}
            />

            <View style={{ marginTop: spacingY._10 }}>
              <Typo size={15} fontWeight="600" style={{ marginBottom: spacingY._5 }}>
                Confirm Identity
              </Typo>
              <Input
                placeholder="Current Password"
                secureTextEntry
                onChangeText={(v) => (passwordRef.current = v)}
                icon={<Icons.Lock size={20} color={themeColors.neutral400} />}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Button loading={loading} onPress={handleSave}>
              <Typo color={themeColors.white} fontWeight="700">
                Save Changes
              </Typo>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default TwoStepVerification;

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
  sectionBody: {
    borderRadius: radius._15,
    paddingHorizontal: spacingX._15,
    marginBottom: spacingY._20,
  },
  form: {
    gap: spacingY._12,
  },
  footer: {
    marginTop: spacingY._30,
  }
});