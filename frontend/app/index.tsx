import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { useAuth } from "@/context/authContext";
import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import Animated, { 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  interpolate 
} from "react-native-reanimated";
import Typo from "@/components/Typo";
import { scale, verticalScale } from "@/utils/styling";

const SplashScreen = () => {
  const { colors, isDark } = useTheme();
  const { t } = useAppSettings();
  const { appReady, token, preloadConversations } = useAuth();
  const router = useRouter();
  
  const [isLogicProcessed, setIsLogicProcessed] = useState(false);
  const preloadStarted = useRef(false);

  // Animation logic
  const loaderBarWidth = scale(80); 
  const containerWidth = scale(160);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false);
  }, [progress]);

  useEffect(() => {
    const prepareApp = async () => {
      // 1. Wait until the Auth context tells us if it's ready (loaded from storage)
      if (!appReady) return;

      if (token && !preloadStarted.current) {
        preloadStarted.current = true;
        preloadConversations(token).catch((err) =>
          console.warn("Conversation preload failed:", err)
        );
      }

      // 2. Mark logic as processed so we can trigger the navigation
      setIsLogicProcessed(true);
    };

    prepareApp();
  }, [appReady, preloadConversations, token]);

  // NAVIGATION TRIGGER
  useEffect(() => {
    if (isLogicProcessed) {
      const path = token ? "/(main)/home" : "/(auth)/welcome";
      router.replace(path);
    }
  }, [isLogicProcessed, router, token]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    transform: [{ 
      translateX: interpolate(progress.value, [0, 1], [-loaderBarWidth, containerWidth]) 
    }]
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.neutral50 }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent />

      <Animated.Image
        source={require("../assets/images/splashImage.png")}
        entering={FadeInDown.duration(700).springify()}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.textWrapper}>
        <Typo color={colors.text} size={26} style={styles.title}>Msgly</Typo>
        <Typo color={colors.neutral500} size={13} style={styles.subtitle}>
          {t("splashSubtitle")}
        </Typo>

        <View style={[styles.loaderBackground, { width: containerWidth }]}>
          <Animated.View 
            style={[
              styles.loaderActive, 
              { backgroundColor: colors.primary, width: loaderBarWidth }, 
              animatedProgressStyle
            ]} 
          />
        </View>
      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  logo: { height: "23%", aspectRatio: 1 },
  textWrapper: { marginTop: 16, alignItems: "center" },
  title: { fontWeight: "700", letterSpacing: 1 },
  subtitle: { marginTop: 4, letterSpacing: 0.6 },
  loaderBackground: {
    marginTop: verticalScale(20),
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    borderRadius: 2,
  },
  loaderActive: { height: '100%', borderRadius: 2 },
});