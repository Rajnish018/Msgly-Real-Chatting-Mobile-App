import React, { useState, useRef } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { At, Lock, ArrowRight } from 'phosphor-react-native';
import { useRouter } from "expo-router";

import Typo from "@/components/Typo";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { spacingX, spacingY, radius } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { useAuth } from "@/context/authContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { verticalScale, scale } from "@/utils/styling";

const Login = () => {
  const router = useRouter();
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const { t } = useAppSettings();

  const emailRef = useRef<string>('');
  const passwordRef = useRef<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const email = emailRef.current.trim();
    const password = passwordRef.current.trim();

    if (!email || !password) {
      Alert.alert(t("login"), t("fillAllFields"));
      return;
    }

    try {
      setIsLoading(true);
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert(t("loginError"), error.message || "An unexpected error occurred");
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
               <Lock size={scale(32)} color={colors.primary} weight="duotone" />
            </View>
            
            {/* 2nd & 3rd: Title then Subtitle (Centered) */}
            <View style={styles.tightGapCentered}>
              <Typo size={28} fontWeight="800" color={colors.neutral900} style={{ textAlign: 'center' }}>
                {t("welcomeBackShort")}
              </Typo>
              <Typo size={15} color={colors.neutral500} style={styles.descriptionCentered}>
                {t("happyToSeeYou")}
              </Typo>
            </View>
          </View>

          {/* 2. FORM BLOCK */}
          <View style={styles.form}>
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
                icon={<At size={verticalScale(20)} color={colors.neutral400} />}
              />
            </View>
            
            {/* Password Group */}
            <View style={styles.tightGap}>
              <View style={styles.labelRow}>
                <Typo size={14} fontWeight="600" color={colors.neutral700}>
                  {t("password") || "Password"}
                </Typo>
                <Pressable onPress={() => router.push('/(auth)/forgotPassword')}>
                  <Typo size={13} fontWeight="600" color={colors.primary}>
                    {t("forgotPasswordShort") || "Forgot?"}
                  </Typo>
                </Pressable>
              </View>
              <Input 
                placeholder={t("enterPassword")}
                secureTextEntry
                onChangeText={(value: string) => (passwordRef.current = value)}
                icon={<Lock size={verticalScale(20)} color={colors.neutral400} />}
              />
            </View>

            {/* Action Group */}
            <View style={{ marginTop: spacingY._10 }}>
              <Button loading={isLoading} onPress={handleSubmit} style={styles.loginButton}>
                <View style={styles.buttonContent}>
                   <Typo fontWeight="700" color={colors.white} size={16}>
                    {t("login")}
                  </Typo>
                  <ArrowRight size={scale(18)} color={colors.white} weight="bold" />
                </View>
              </Button>
            </View>
          </View>

          {/* 3. FOOTER BLOCK */}
          <View style={styles.footer}>
            <Typo size={15} color={colors.neutral500}>
              {t("dontHaveAccount")}
            </Typo>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Typo fontWeight="700" size={15} color={colors.primary}>
                {" "}{t("signUp")}
              </Typo>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacingX._25,
    paddingVertical: spacingY._30,
  },
  headerSection: {
    marginBottom: spacingY._40,
    alignItems: 'center', // Centers everything in the header
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
  tightGap: {
    gap: spacingY._7,
  },
  label: {
    marginLeft: spacingX._5,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: spacingX._5,
    marginLeft: spacingX._5,
  },
  loginButton: {
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacingY._40,
  },
});