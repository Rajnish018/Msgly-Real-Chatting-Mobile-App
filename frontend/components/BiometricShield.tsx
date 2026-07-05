import React, { useEffect, useState, useRef } from "react";
import { AppState, StyleSheet, View } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Typo from "./Typo";
import Button from "./Button";
import Loading from "./Loading";
import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { scale } from "@/utils/styling";

const BIOMETRIC_LOCK_KEY = "biometricLockEnabled";
const GRACE_PERIOD = 5000; 

export const BiometricLock = ({ children }: { children: React.ReactNode }) => {
  const { colors: themeColors } = useTheme();
  const { t, isReady } = useAppSettings(); // 1. Added isReady check from context
  
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  const appState = useRef(AppState.currentState);
  const lastBackgroundTime = useRef<number | null>(null);
  const isAuthenticating = useRef(false);
  const triggerAuthRef = useRef<(force?: boolean) => Promise<void>>(async () => {});

  triggerAuthRef.current = async (force = false) => {
    if (isAuthenticating.current) return;

    try {
      const isEnabled = await AsyncStorage.getItem(BIOMETRIC_LOCK_KEY);
      
      if (isEnabled !== "true") {
        setIsLocked(false);
        setIsChecking(false);
        return;
      }

      const now = Date.now();
      const timeElapsed = lastBackgroundTime.current ? now - lastBackgroundTime.current : 0;
      
      if (!force && !isLocked && timeElapsed < GRACE_PERIOD) {
        setIsLocked(false);
        setIsChecking(false);
        return;
      }

      setIsLocked(true);
      setIsChecking(false);
      isAuthenticating.current = true;

      // 2. Add a tiny delay (150ms) to ensure the UI thread 
      // and Context have finished syncing the Hindi strings
      if (force) await new Promise(resolve => setTimeout(resolve, 150));

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t("unlockApp") || "Unlock Msgly",
        fallbackLabel: t("usePasscode") || "Use Passcode",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
        lastBackgroundTime.current = null;
      }
    } catch (error) {
      console.error("Biometric Auth Error:", error);
      setIsLocked(true);
    } finally {
      isAuthenticating.current = false;
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // 3. Only trigger auth if the AppSettings are fully loaded
    if (isReady) {
      triggerAuthRef.current(true);
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        triggerAuthRef.current();
      } else if (nextAppState.match(/inactive|background/)) {
        lastBackgroundTime.current = Date.now();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [isReady]);

  return (
    <View style={{ flex: 1 }}>
      {/* ALWAYS render children so Expo Router's Stack doesn't unmount */}
      <View style={{ flex: 1, display: (isChecking || !isReady || isLocked) ? "none" : "flex" }}>
        {children}
      </View>

      {/* Overlay Loading State */}
      {(isChecking || !isReady) && (
        <View style={[StyleSheet.absoluteFill, styles.container, { backgroundColor: themeColors.white, zIndex: 999 }]}>
          <Loading />
        </View>
      )}

      {/* Overlay Lock State */}
      {isLocked && !(isChecking || !isReady) && (
        <View style={[StyleSheet.absoluteFill, styles.container, { backgroundColor: themeColors.white, zIndex: 999 }]}>
          <View style={styles.content}>
            <Typo size={26} fontWeight="700" color={themeColors.text}>
              {t("appLockedTitle")}
            </Typo>
            
            <Typo color={themeColors.neutral500} style={styles.description}>
              {t("authRequiredDesc")}
            </Typo>
            
            <Button 
              onPress={() => triggerAuthRef.current(true)} 
              style={[styles.button, { backgroundColor: themeColors.primary }]}
            >
              <Typo color={colors.white} fontWeight="700">
                {t("unlockButton")}
              </Typo>
            </Button>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { width: "100%", alignItems: "center", paddingHorizontal: spacingX._30 },
  description: { marginTop: spacingY._10, marginBottom: spacingY._30, textAlign: "center", lineHeight: scale(20) },
  button: { width: "100%", height: scale(54), borderRadius: radius._15 },
});
