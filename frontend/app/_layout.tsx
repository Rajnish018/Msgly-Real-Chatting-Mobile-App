import "@/utils/cryptoPolyfill";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

// Services & Context
import NotificationService from "@/services/NotificationService";
import { AuthProvider } from "@/context/authContext";
import { AppSettingsProvider } from "@/context/appSettingsContext";
import { CustomAlertProvider } from "@/context/customAlertContext";
import { ForegroundNotificationProvider } from "@/context/foregroundNotificationContext";
import { ThemeProvider } from "@/context/themeContext";
import { BiometricLock } from "@/components/BiometricShield";

// Prevent splash screen from auto-hiding immediately
SplashScreen.preventAutoHideAsync();

/**
 * Main Stack Navigation Configuration
 */
const StackLayout = () => (
  <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="index" />
    <Stack.Screen
      name="(main)/profileModal"
      options={{ 
        presentation: "transparentModal", 
        animation: "slide_from_bottom" 
      }}
    />
    <Stack.Screen
      name="(main)/newConversationModal"
      options={{ 
        presentation: "modal", 
        animation: "slide_from_bottom" 
      }}
    />
  </Stack>
);

export default function RootLayout() {
  
  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Initialize Notification Service
        // This handles Permissions, Android Channels, and Foreground Listeners
        await NotificationService.initialize();

        // 2. Token Sync
        // In production, you'd typically send this to your Node.js/MongoDB backend
        const token = await NotificationService.getDeviceToken();
        if (token) {
          // console.log("FCM Token initialized:", token);
        }

      } catch (error) {
        // Log errors but don't let them freeze the splash screen
        console.error("Failed to initialize app services:", error);
      } finally {
        // 3. Finally hide the splash screen
        await SplashScreen.hideAsync();
      }
    };

    initApp();

    return () => {
      NotificationService.cleanup();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ThemeProvider>
          <ForegroundNotificationProvider>
            <CustomAlertProvider>
              <AuthProvider>
                <AppSettingsProvider>
                  {/* BiometricLock handles the app-level security overlay */}
                  <BiometricLock>
                    <StackLayout />
                  </BiometricLock>
                </AppSettingsProvider>
              </AuthProvider>
            </CustomAlertProvider>
          </ForegroundNotificationProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
