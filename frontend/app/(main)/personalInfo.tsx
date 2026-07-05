import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import Typo from "@/components/Typo";
import { colors, spacingX, spacingY } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useTheme } from "@/context/themeContext";
import { scale } from "@/utils/styling";

const PersonalInfo = () => {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useAppSettings();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icons.CaretLeft size={scale(24)} color={colors.black} weight="bold" />
        </TouchableOpacity>
        <Typo size={20} fontWeight="700">{t("personalInfo")}</Typo>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.content}>
        <Typo>{t("personalInfoDescription")}</Typo>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: spacingX._20,
    alignItems: 'center' 
  },
  content: { padding: spacingX._20 }
});

export default PersonalInfo;
