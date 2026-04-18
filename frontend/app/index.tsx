import { useRouter } from "expo-router";
import { colors } from "@/constants/theme";
import React from "react";
import { StyleSheet, View, StatusBar } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Typo from "@/components/Typo";

const SplashScreen = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle={"light-content"} backgroundColor={colors.neutral900} />

      <Animated.Image
        source={require("../assets/images/splashImage.png")}
        entering={FadeInDown.duration(700).springify()}
        style={styles.logo}
        resizeMode="contain"
      />

      
      <View style={styles.textWrapper}>
        <Typo color={colors.white} size={26} style={styles.title}>
          Msgly
        </Typo>

        <Typo color={colors.white} size={13} style={styles.subtitle}>
          Real Time Chatting App
        </Typo>
      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.neutral900,
  },

  logo: {
    height: "23%",
    aspectRatio: 1,
  },

  textWrapper: {
    marginTop: 16, 
    alignItems: "center", 
  },

  title: {
    fontWeight: "700",
    letterSpacing: 1,
  },

  subtitle: {
    marginTop: 4,
    opacity: 0.8,
    letterSpacing: 0.6,
  },
});
