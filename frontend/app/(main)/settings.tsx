import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import Avatar from "@/components/Avatar";
import LanguageSelector from "@/components/LanguageSelector";
import { getLanguageOption } from "@/constants/languages";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAuth } from "@/context/authContext";
import { useCustomAlert } from "@/context/customAlertContext";
import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { scale, verticalScale } from "@/utils/styling";

const Settings = () => {
  const { user, logOut } = useAuth();
  const { showAlert } = useCustomAlert();
  const { colors: themeColors, isDark, toggleDarkMode } = useTheme();
  const { t, language, setLanguage, notificationsEnabled, setNotificationsEnabled, resetSettings } = useAppSettings();
  const router = useRouter();
  const [isLanguageSelectorVisible, setIsLanguageSelectorVisible] = useState(false);

  const handleLogout = async () => {
    showAlert({
      title: t("logout"),
      message: t("logoutConfirm"),
      variant: "warning",
      buttons: [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("logout"),
          style: "destructive",
          onPress: async () =>
            await logOut(async () => {
              resetSettings();
            }),
        },
      ],
    });
  };

  const selectedLanguageLabel = t(getLanguageOption(language).labelKey);

const SettingItem = ({ 
  icon: Icon, 
  title, 
  subtitle, 
  value, 
  onPress, 
  isSwitch = false, 
  switchValue, 
  onSwitchChange,
  color = themeColors.black,
  showBorder = true
}: any) => (
  <TouchableOpacity 
    activeOpacity={0.7} 
    onPress={onPress} 
    disabled={isSwitch || !onPress}
    style={[styles.item, { borderBottomColor: themeColors.neutral200 }, !showBorder && { borderBottomWidth: 0 }]}
  >
    <View style={styles.itemLeft}>
      <View style={styles.iconContainer}>
        <Icon size={scale(22)} color={color} weight="regular" />
      </View>
      <View style={styles.textContainer}>
        <Typo size={16} fontWeight="500" color={color}>{title}</Typo>
        {subtitle && (
          <Typo size={13} color={themeColors.neutral500} style={styles.subtitle}>
            {subtitle}
          </Typo>
        )}
      </View>
    </View>
    
    {isSwitch ? (
      <Switch 
        value={switchValue} 
        onValueChange={onSwitchChange}
        trackColor={{ false: themeColors.neutral200, true: themeColors.primary }}
        thumbColor={Platform.OS === 'ios' ? undefined : themeColors.white}
      />
    ) : (
      <View style={styles.itemRight}>
        {value && <Typo color={themeColors.neutral500} size={14}>{value}</Typo>}
      </View>
    )}
  </TouchableOpacity>
);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.white }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: themeColors.neutral100 }]}>
          <Icons.CaretLeft size={scale(24)} color={themeColors.black} weight="bold" />
        </TouchableOpacity>
        <Typo size={20} fontWeight="700">{t("settings")}</Typo>
        <View style={{ width: scale(40) }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* PROFILE CARD */}
        <TouchableOpacity 
          style={[styles.profileCard, { backgroundColor: themeColors.neutral100 }]} 
          onPress={() => router.push("/(main)/profileModal")}
        >
          <Avatar size={scale(60)} uri={user?.avatar || ""} rounded={radius._20} />
          <View style={styles.profileInfo}>
            <Typo size={18} fontWeight="700">{user?.name || "User"}</Typo>
          </View>
          <Icons.PencilLine size={scale(20)} color={themeColors.primary} weight="fill" />
        </TouchableOpacity>

        {/* ACCOUNT SECTION */}
        <View style={styles.section}>
          {/* <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>{t("account")}</Typo> */}
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem 
              icon={Icons.KeyIcon} 
              title={t("account")} 
              subtitle={t("accountSubtitle")}
              onPress={() => router.push("/(main)/account")} 
            />
            <SettingItem 
              icon={Icons.LockIcon} 
              title={t("privacy")} 
              subtitle={t("privacySubtitle")}
              onPress={() => router.push("/(main)/privacy")} 
            />
            <SettingItem 
              icon={Icons.ChatTextIcon} 
              title={t("chats")} 
              subtitle={t("chatSubtitle")}
              onPress={() => router.push("/(main)/chats")} 
            />
             <SettingItem 
              icon={Icons.BellIcon} 
              title={t("notifications")} 
              subtitle={t("notificationsSubtitle")}
              onPress={() => router.push("/(main)/notifications")} 
            />
            <SettingItem 
              icon={Icons.BellSimple} 
              title={t("notifications")} 
              isSwitch 
              switchValue={notificationsEnabled}
              onSwitchChange={setNotificationsEnabled}
              showBorder={false}
            />
          </View>
        </View>

        {/* PREFERENCES SECTION */}
        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>{t("preferences")}</Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem 
              icon={Icons.Moon} 
              title={t("darkMode")} 
              isSwitch 
              switchValue={isDark}
              onSwitchChange={toggleDarkMode}
            />
            <SettingItem 
              icon={Icons.Globe} 
              title={t("Applanguage")} 
              value={selectedLanguageLabel}
              onPress={() => setIsLanguageSelectorVisible(true)}
              showBorder={true}
            />

            <SettingItem 
              icon={Icons.SealQuestionIcon} 
              title={t("helpfeedback")} 
              subtitle={t("helpfeedbackSubtitle")}
              onPress={() => router.push("/(main)/help")} 
            />
            
          </View>
        </View>

        {/* ACTIONS */}
        <View style={[styles.section, { marginBottom: verticalScale(40) }]}>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem 
              icon={Icons.SignOut} 
              title={t("logout")} 
              color={themeColors.rose}
              onPress={handleLogout} 
              showBorder={false}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Typo color={themeColors.neutral400} size={12}>{t("version")} 1.0.4</Typo>
        </View>
      </ScrollView>

      <LanguageSelector
        visible={isLanguageSelectorVisible}
        selectedLanguage={language}
        title={t("selectLanguage")}
        cancelLabel={t("cancel")}
        getOptionLabel={(code) => t(getLanguageOption(code).labelKey)}
        onClose={() => setIsLanguageSelectorVisible(false)}
        onSelect={setLanguage}
      />
    </SafeAreaView>
  );
};

export default Settings;

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
  scrollContent: { paddingHorizontal: spacingX._20, paddingBottom: verticalScale(40) },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacingX._15,
    backgroundColor: colors.neutral100,
    borderRadius: radius._20,
    marginTop: spacingY._10,
    marginBottom: spacingY._25,
  },
  profileInfo: { flex: 1, marginLeft: spacingX._15 },
  section: { marginBottom: spacingY._20 },
  sectionLabel: { marginBottom: spacingY._10, marginLeft: spacingX._5, letterSpacing: 1 },
  sectionBody: {
    backgroundColor: colors.neutral100,
    borderRadius: radius._15,
    paddingHorizontal: spacingX._15,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacingY._15,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center', // Keeps icon vertically centered with the text block
    flex: 1,              // Ensures text doesn't push the right side off screen
  },
  textContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: scale(12), // Adjust spacing between icon and text as needed
  },
  subtitle: {
    marginTop: scale(2),   // Slight breathing room under the title
  },
  iconContainer: { padding: scale(4) },
  itemRight: { flexDirection: "row", alignItems: "center", gap: spacingX._7 },
  footer: { alignItems: 'center' }
});
