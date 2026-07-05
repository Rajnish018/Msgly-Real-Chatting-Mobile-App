import React, { useState, useRef } from "react";
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Alert 
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { spacingX, spacingY, radius } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useTheme } from "@/context/themeContext";
import { scale, verticalScale } from "@/utils/styling";

const ForgotPassword = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useAppSettings();
  
  const emailRef = useRef<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    const email = emailRef.current.trim();
    if (!email) {
      Alert.alert(t("forgotPassword"), t("fillAllFields"));
      return;
    }

    try {
      setIsLoading(true);
      Alert.alert(
        t("success"), 
        t("resetLinkSent"), 
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(t("error"), error.message || "Error occurred");
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
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
               <Icons.Key size={scale(32)} color={colors.primary} weight="duotone" />
            </View>
            
            <View style={styles.tightGapCentered}>
              {/* Title: Forced into one line and centered */}
              <Typo 
                size={26} 
                fontWeight="800" 
                color={colors.neutral900} 
                style={styles.textCenter}
                numberOfLines={1} 
                adjustsFontSizeToFit // Shrinks text slightly if it's too long for small screens
              >
                {t("forgotPassword")}
              </Typo>
              
              <Typo size={15} color={colors.neutral500} style={styles.descriptionCentered}>
                {t("forgotPasswordDescription")}
              </Typo>
            </View>
          </View>

          {/* 2. FORM BLOCK */}
          <View style={styles.form}>
            <View style={styles.tightGap}>
              <Typo size={14} fontWeight="600" color={colors.neutral700} style={styles.label}>
                {t("emailAddress")}
              </Typo>
              <Input
                placeholder={t("enterEmail")}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(value: string) => (emailRef.current = value)}
                icon={<Icons.At size={verticalScale(20)} color={colors.neutral400} />}
              />
            </View>

            <View style={{ marginTop: spacingY._10 }}>
              <Button loading={isLoading} onPress={handleResetPassword} style={styles.resetButton}>
                <View style={styles.buttonContent}>
                  <Typo fontWeight="700" color={colors.white} size={16}>
                    {t("sendResetLink")}
                  </Typo>
                  <Icons.PaperPlaneTilt size={scale(18)} color={colors.white} weight="bold" />
                </View>
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
    width: '100%',
  },
  textCenter: {
    textAlign: 'center',
    width: '100%',
  },
  descriptionCentered: {
    textAlign: 'center',
    lineHeight: verticalScale(20),
    paddingHorizontal: spacingX._15,
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
  resetButton: {
    height: verticalScale(54),
    borderRadius: radius._15,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacingX._10,
  },
});

export default ForgotPassword;