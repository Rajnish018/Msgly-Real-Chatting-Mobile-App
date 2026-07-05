import React, { useState, useRef } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useTheme } from "@/context/themeContext";
import { useAuth } from "@/context/authContext";
import { scale, verticalScale } from "@/utils/styling";

const Register = () => {
  const router = useRouter();
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const { t } = useAppSettings();

  const nameRef = useRef<string>("");
  const emailRef = useRef<string>("");
  const passwordRef = useRef<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    const name = nameRef.current.trim();
    const email = emailRef.current.trim();
    const password = passwordRef.current.trim();

    if (!name || !email || !password) {
      Alert.alert(t("signUp"), t("fillAllFields"));
      return;
    }

    try {
      setIsLoading(true);
      await signUp(email, password, name);
    } catch (error: any) {
      Alert.alert(t("signUpError"), error.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* 1. CENTERED HEADER BLOCK */}
          <View style={styles.headerSection}>
            {/* 1st: Icon */}
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
               <Icons.UserPlus size={scale(32)} color={colors.primary} weight="duotone" />
            </View>
            
            {/* 2nd & 3rd: Title then Subtitle */}
            <View style={styles.tightGapCentered}>
              <Typo size={28} fontWeight="800" color={colors.neutral900} style={{ textAlign: 'center' }}>
                {t("joinUs")}
              </Typo>
              <Typo size={15} color={colors.neutral500} style={styles.descriptionCentered}>
                {t("startYourJourney")}
              </Typo>
            </View>
          </View>

          {/* 2. FORM BLOCK */}
          <View style={styles.form}>
            
            {/* Name Group */}
            <View style={styles.tightGap}>
              <Typo size={14} fontWeight="600" color={colors.neutral700} style={styles.label}>
                {t("fullName") || "Full Name"}
              </Typo>
              <Input
                placeholder={t("enterName")}
                onChangeText={(value: string) => (nameRef.current = value)}
                icon={<Icons.User size={verticalScale(20)} color={colors.neutral400} />}
              />
            </View>

            {/* Email Group */}
            <View style={styles.tightGap}>
              <Typo size={14} fontWeight="600" color={colors.neutral700} style={styles.label}>
                {t("emailAddress") || "Email Address"}
              </Typo>
              <Input
                placeholder={t("enterEmail")}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(value: string) => (emailRef.current = value)}
                icon={<Icons.At size={verticalScale(20)} color={colors.neutral400} />}
              />
            </View>

            {/* Password Group */}
            <View style={styles.tightGap}>
              <Typo size={14} fontWeight="600" color={colors.neutral700} style={styles.label}>
                {t("password") || "Password"}
              </Typo>
              <Input
                placeholder={t("enterPassword")}
                secureTextEntry
                onChangeText={(value: string) => (passwordRef.current = value)}
                icon={<Icons.Lock size={verticalScale(20)} color={colors.neutral400} />}
              />
            </View>

            {/* Action Group */}
            <View style={{ marginTop: spacingY._10 }}>
              <Button loading={isLoading} onPress={handleRegister} style={styles.registerButton}>
                <View style={styles.buttonContent}>
                  <Typo fontWeight="700" color={colors.white} size={16}>
                    {t("signUp")}
                  </Typo>
                  <Icons.ArrowRight size={scale(18)} color={colors.white} weight="bold" />
                </View>
              </Button>
            </View>
          </View>

          {/* 3. FOOTER BLOCK */}
          <View style={styles.footer}>
            <Typo size={15} color={colors.neutral500}>{t("alreadyHaveAccount")}</Typo>
            <Pressable onPress={() => router.push("/(auth)/login")}>
              <Typo fontWeight="700" size={15} color={colors.primary}>
                {" "}{t("login")}
              </Typo>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButtonWrapper: {
    position: 'absolute',
    top: spacingY._20,
    left: spacingX._20,
    zIndex: 10,
  },
  backButton: {
    padding: scale(8),
    borderRadius: radius._12,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacingX._25,
    paddingVertical: spacingY._30,
  },
  /* CONTENT BLOCK SPACING & ALIGNMENT */
  headerSection: {
    marginBottom: spacingY._40,
    alignItems: 'center',
  },
  iconBox: {
    width: scale(64),
    height: scale(64),
    borderRadius: radius._15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacingY._20,
  },
  tightGapCentered: {
    gap: spacingY._10,
    alignItems: 'center',
  },
  descriptionCentered: {
    textAlign: 'center',
    lineHeight: verticalScale(20),
  },
  form: {
    gap: spacingY._25,
  },
  /* AUTO-TIGHTENING LOGIC */
  tightGap: {
    gap: spacingY._7,
  },
  label: {
    marginLeft: spacingX._5,
  },
  registerButton: {
    height: verticalScale(54),
    borderRadius: radius._15,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacingX._10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacingY._40,
  },
});