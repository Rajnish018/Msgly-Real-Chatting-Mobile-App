import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";

import Button from "@/components/Button";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { spacingX, spacingY, radius } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useTheme } from "@/context/themeContext";
import { verticalScale } from "@/utils/styling";

const Welcome = () => {
  const router = useRouter();
  const { colors } = useTheme(); // useTheme already provides isDark if needed
  const { t } = useAppSettings();

  return (
    <ScreenWrapper showPattern={true} bgOpacity={0.6}>
      <View style={styles.container}>
        
        {/* BRANDING */}
        <Animated.View 
          entering={FadeInDown.duration(600).springify()}
          style={styles.brandContainer}
        >
          <Typo color={colors.primary} fontWeight="900" size={48}>
            Msgly
          </Typo>
        </Animated.View>

        {/* HERO IMAGE */}
        <Animated.Image
          entering={FadeIn.duration(1000).delay(200)}
          source={require('../../assets/images/welcome.png')}
          style={styles.welcomeImage}
          resizeMode="contain"
        />

        {/* WELCOME TEXT BLOCK */}
        <Animated.View 
          entering={FadeInDown.duration(800).delay(400).springify()}
          style={styles.textContainer}
        >
          <Typo color={colors.text} size={34} fontWeight="800">
            {t("stayConnected")}
          </Typo>
          <Typo color={colors.text} size={34} fontWeight="800">
            {t("withCloseFriends")}
          </Typo>
          <Typo color={colors.primary} size={34} fontWeight="800">
            {t("andFamily")}
          </Typo>
        </Animated.View>

        {/* GET STARTED BUTTON */}
        <Animated.View entering={FadeInDown.duration(800).delay(600).springify()}>
          <Button 
            style={[styles.startButton, { backgroundColor: colors.primary }]} 
            onPress={() => router.push('/(auth)/login')}
          >
            <Typo size={20} fontWeight="bold" color={colors.white}>
              {t("getStarted")}
            </Typo>
          </Button>
        </Animated.View>

      </View>
    </ScreenWrapper>
  );
};

export default Welcome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-around',
    paddingHorizontal: spacingX._25,
    paddingVertical: spacingY._40,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: spacingY._10,
  },
  welcomeImage: {
    height: verticalScale(300),
    width: '100%',
    alignSelf: 'center',
  },
  textContainer: {
    gap: 2, // Keeps the multi-line title tight
  },
  startButton: {
    height: verticalScale(56),
    borderRadius: radius._15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
});