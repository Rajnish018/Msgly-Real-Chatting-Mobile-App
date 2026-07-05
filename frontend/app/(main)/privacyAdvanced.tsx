import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import SettingItem from "@/components/SettingItem";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useTheme } from "@/context/themeContext";
import { scale, verticalScale } from "@/utils/styling";

const PrivacyAdvanced = () => {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { settings, updateSettings } = useAppSettings();
  const privacy = settings.privacy;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.white }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: themeColors.neutral100 }]}
        >
          <Icons.CaretLeft size={scale(24)} color={themeColors.black} weight="bold" />
        </TouchableOpacity>
        <Typo size={20} fontWeight="700">
          Advanced Privacy
        </Typo>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
          <SettingItem
            icon={Icons.Phone}
            title="Protect IP address in calls"
            subtitle="Relay voice traffic to reduce direct network exposure"
            isSwitch
            switchValue={privacy.protectIpInCalls}
            onSwitchChange={(value) => updateSettings({ privacy: { protectIpInCalls: value } })}
          />
          <SettingItem
            icon={Icons.Link}
            title="Disable link previews"
            subtitle="Stop automatic rich previews for links you share"
            isSwitch
            switchValue={privacy.disableLinkPreviews}
            onSwitchChange={(value) => updateSettings({ privacy: { disableLinkPreviews: value } })}
          />
          <SettingItem
            icon={Icons.DeviceMobile}
            title="Screen security"
            subtitle="Hide sensitive chat content from screenshots and app switchers"
            isSwitch
            switchValue={privacy.screenSecurity}
            onSwitchChange={(value) => updateSettings({ privacy: { screenSecurity: value } })}
            showBorder={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacyAdvanced;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingX._20,
    paddingVertical: spacingY._15,
  },
  backButton: {
    backgroundColor: colors.neutral100,
    padding: scale(8),
    borderRadius: radius._10,
  },
  content: {
    paddingHorizontal: spacingX._20,
    paddingBottom: verticalScale(40),
  },
  sectionBody: {
    backgroundColor: colors.neutral100,
    borderRadius: radius._15,
    paddingHorizontal: spacingX._15,
  },
});
