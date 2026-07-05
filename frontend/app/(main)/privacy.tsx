import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import * as LocalAuthentication from "expo-local-authentication";

import SelectorModal from "@/components/SelectorModal";
import SettingItem from "@/components/SettingItem";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { deleteMyAccount, exportMyData } from "@/services/authService";
import { scale, verticalScale } from "@/utils/styling";

const BIOMETRIC_LOCK_KEY = "biometricLockEnabled";

const standardOptions = [
  { label: "Everyone", value: "everyone" },
  { label: "My contacts", value: "contacts" },
  { label: "Nobody", value: "nobody" },
];

const statusOptions = [
  { label: "My contacts", value: "contacts" },
  { label: "My contacts except...", value: "except" },
  { label: "Only share with...", value: "share" },
];

const timerOptions = [
  { label: "24 hours", value: "24h" },
  { label: "7 days", value: "7d" },
  { label: "90 days", value: "90d" },
  { label: "Off", value: "off" },
];

const getSelectedLabel = (value: string, options: { label: string; value: string }[]) =>
  options.find((option) => option.value === value)?.label || value;

const PrivacyPage = () => {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { t, settings, updateSettings } = useAppSettings();
  const { token, logOut } = useAuth();
  const privacySettings = settings.privacy;

  const [biometricLock, setBiometricLock] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalOptions, setModalOptions] = useState<{ label: string; value: string }[]>([]);
  const [modalSelectedValue, setModalSelectedValue] = useState("");
  const [modalOnSelect, setModalOnSelect] = useState<(value: string) => void>(() => {});

  React.useEffect(() => {
    AsyncStorage.getItem(BIOMETRIC_LOCK_KEY).then((value) => {
      setBiometricLock(value === "true");
    });
  }, []);

  const openSelector = (
    title: string,
    options: { label: string; value: string }[],
    currentValue: string,
    onSelect: (value: string) => void
  ) => {
    setModalTitle(title);
    setModalOptions(options);
    setModalSelectedValue(currentValue);
    setModalOnSelect(() => onSelect);
    setModalVisible(true);
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      try {
        const compatible = await LocalAuthentication?.hasHardwareAsync?.();
        const enrolled = await LocalAuthentication?.isEnrolledAsync?.();

        if (!compatible || !enrolled) {
          Alert.alert(t("featureUnavailable"), t("biometricUnavailable"));
          return;
        }

        const result = await LocalAuthentication?.authenticateAsync?.({
          promptMessage: t("confirmBiometrics") || "Verify identity to enable lock",
          disableDeviceFallback: false,
        });

        if (!result?.success) return;
      } catch (error) {
        Alert.alert(t("error"), t("somethingWentWrong"));
        return;
      }
    }

    setBiometricLock(value);
    await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, String(value));
  };

  const handleExportData = async () => {
    if (!token) return;
    setLoadingKey("export");

    try {
      const response = await exportMyData(token);
      if (!response?.success) {
        throw new Error(response?.msg || t("somethingWentWrong"));
      }
      Alert.alert(
        t("downloadMyData") || "Download my data",
        response?.msg || t("exportSuccess") || "Data requested successfully."
      );
    } catch (error: any) {
      Alert.alert(
        t("downloadMyData") || "Download my data",
        error?.message || t("somethingWentWrong")
      );
    } finally {
      setLoadingKey(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    setLoadingKey("delete");
    try {
      const response = await deleteMyAccount(token);
      if (!response?.success) throw new Error(response?.msg || t("somethingWentWrong"));
      await logOut();
    } catch (error: any) {
      Alert.alert(t("deleteAccount"), error?.message || t("somethingWentWrong"));
    } finally {
      setLoadingKey(null);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(t("deleteAccount"), t("deleteAccountConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("deactivateAccount"), style: "destructive", onPress: handleDeleteAccount },
    ]);
  };

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
          {t("privacy") || "Privacy"}
        </Typo>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={[styles.checkupCard, { backgroundColor: themeColors.neutral100 }]}
          onPress={() => router.push("/(main)/privacyCheckup")}
        >
          <View style={styles.checkupLeft}>
            <Icons.ShieldCheck size={scale(28)} color={themeColors.primary} weight="duotone" />
            <View style={styles.checkupText}>
              <Typo size={16} fontWeight="700">
                {t("privacyCheckupTitle") || "Privacy checkup"}
              </Typo>
              <Typo size={13} color={themeColors.neutral500}>
                {t("privacyCheckupDesc") || "Control your privacy and choose settings right for you."}
              </Typo>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("whoCanSeeInfo") || "WHO CAN SEE MY PERSONAL INFO"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.ShieldCheckered}
              title={t("privateProfile") || "Private profile"}
              subtitle={t("privateProfileDesc") || "Only friends can see your activity"}
              isSwitch
              switchValue={privacySettings.privateProfile}
              onSwitchChange={(value) => updateSettings({ privacy: { privateProfile: value } })}
            />
            <SettingItem
              icon={Icons.Eye}
              title={t("showOnlineStatus") || "Show Online Status"}
              subtitle={t("showOnlineStatusDesc") || "Let others see when you're active"}
              isSwitch
              switchValue={privacySettings.showOnlineStatus}
              onSwitchChange={(value) => updateSettings({ privacy: { showOnlineStatus: value } })}
            />
            <SettingItem
              icon={Icons.Clock}
              title={t("lastSeenOnline") || "Last seen and online"}
              value={getSelectedLabel(privacySettings.lastSeenVisibility, standardOptions)}
              onPress={() =>
                openSelector(
                  "Last seen and online",
                  standardOptions,
                  privacySettings.lastSeenVisibility,
                  (value) => updateSettings({ privacy: { lastSeenVisibility: value as any } })
                )
              }
            />
            <SettingItem
              icon={Icons.UserCircle}
              title={t("profilePicture") || "Profile picture"}
              value={getSelectedLabel(privacySettings.profilePhotoVisibility, standardOptions)}
              onPress={() =>
                openSelector("Profile picture", standardOptions, privacySettings.profilePhotoVisibility, (value) =>
                  updateSettings({ privacy: { profilePhotoVisibility: value as any } })
                )
              }
            />
            <SettingItem
              icon={Icons.Info}
              title={t("about") || "About"}
              value={getSelectedLabel(privacySettings.aboutVisibility, standardOptions)}
              onPress={() =>
                openSelector("About", standardOptions, privacySettings.aboutVisibility, (value) =>
                  updateSettings({ privacy: { aboutVisibility: value as any } })
                )
              }
            />
            <SettingItem
              icon={Icons.Link}
              title={t("links") || "Links"}
              value={getSelectedLabel(privacySettings.linksVisibility, standardOptions)}
              onPress={() =>
                openSelector("Links", standardOptions, privacySettings.linksVisibility, (value) =>
                  updateSettings({ privacy: { linksVisibility: value as any } })
                )
              }
            />
            <SettingItem
              icon={Icons.CircleNotch}
              title={t("status") || "Status"}
              value={getSelectedLabel(privacySettings.statusVisibility, statusOptions)}
              onPress={() =>
                openSelector("Status", statusOptions, privacySettings.statusVisibility, (value) =>
                  updateSettings({ privacy: { statusVisibility: value as any } })
                )
              }
            />
            <SettingItem
              icon={Icons.Checks}
              title={t("readReceipts") || "Read receipts"}
              subtitle={
                t("readReceiptsDesc") ||
                "If turned off, you won't send or receive read receipts."
              }
              isSwitch
              switchValue={privacySettings.readReceipts}
              onSwitchChange={(value) => updateSettings({ privacy: { readReceipts: value } })}
              showBorder={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("disappearingMessages") || "DISAPPEARING MESSAGES"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.Hourglass}
              title={t("defaultMessageTimer") || "Default message timer"}
              subtitle={t("defaultTimerDesc") || "Start new chats with disappearing messages set to your timer"}
              value={getSelectedLabel(privacySettings.disappearingMessagesTimer, timerOptions)}
              onPress={() =>
                openSelector("Default message timer", timerOptions, privacySettings.disappearingMessagesTimer, (value) =>
                  updateSettings({ privacy: { disappearingMessagesTimer: value as any } })
                )
              }
              showBorder={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.Users}
              title={t("groups") || "Groups"}
              value={getSelectedLabel(privacySettings.groupAddPermission, standardOptions)}
              onPress={() =>
                openSelector("Groups", standardOptions, privacySettings.groupAddPermission, (value) =>
                  updateSettings({ privacy: { groupAddPermission: value as any } })
                )
              }
            />
            <SettingItem
              icon={Icons.Smiley}
              title={t("avatarStickers") || "Avatar stickers"}
              subtitle={t("avatarStickersDesc") || "Allow search inside avatar interactions"}
              isSwitch
              switchValue={privacySettings.avatarStickers}
              onSwitchChange={(value) => updateSettings({ privacy: { avatarStickers: value } })}
            />
            <SettingItem
              icon={Icons.MapPin}
              title={t("liveLocation") || "Live location"}
              subtitle="Allow live location sharing inside chats"
              isSwitch
              switchValue={privacySettings.liveLocationSharing}
              onSwitchChange={(value) => updateSettings({ privacy: { liveLocationSharing: value } })}
            />
            <SettingItem
              icon={Icons.Phone}
              title={t("calls") || "Calls"}
              subtitle={t("silenceUnknown") || "Silence unknown callers"}
              isSwitch
              switchValue={privacySettings.silenceUnknownCallers}
              onSwitchChange={(value) => updateSettings({ privacy: { silenceUnknownCallers: value } })}
            />
            <SettingItem
              icon={Icons.AddressBook}
              title={t("contacts") || "Contacts"}
              value={`Blocked: ${privacySettings.blockedUserIds.length}`}
              onPress={() => router.push("/(main)/privacyContacts")}
              showBorder={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("securityLocks") || "SECURITY LOCKS"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.Fingerprint}
              title={t("appLock") || "App lock"}
              isSwitch
              switchValue={biometricLock}
              onSwitchChange={handleBiometricToggle}
            />
            <SettingItem
              icon={Icons.ChatTeardropText}
              title={t("chatLock") || "Chat lock"}
              subtitle={t("chatLockDesc") || "Keep hidden chats locked and secured"}
              isSwitch
              switchValue={privacySettings.chatLock}
              onSwitchChange={(value) => updateSettings({ privacy: { chatLock: value } })}
              showBorder={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("advanced") || "ADVANCED"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.Sliders}
              title={t("advancedPrivacy") || "Advanced settings"}
              subtitle={t("advancedDesc") || "Protect IP address in calls, disable link previews"}
              onPress={() => router.push("/(main)/privacyAdvanced")}
            />
            <SettingItem
              icon={Icons.DownloadSimple}
              title={loadingKey === "export" ? t("processing") || "Processing..." : t("downloadMyData") || "Download my data"}
              subtitle={
                t("downloadMyDataDesc") ||
                "Request a copy of your personal data and account details"
              }
              onPress={handleExportData}
              showBorder={false}
            />
          </View>
        </View>

        <View style={[styles.section, { marginBottom: verticalScale(20) }]}>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.Trash}
              title={loadingKey === "delete" ? t("processing") || "Processing..." : t("deleteAccount") || "Delete account"}
              color={themeColors.rose}
              onPress={confirmDeleteAccount}
              showBorder={false}
            />
          </View>
        </View>
      </ScrollView>

      <SelectorModal
        visible={modalVisible}
        title={modalTitle}
        options={modalOptions}
        selectedValue={modalSelectedValue}
        onClose={() => setModalVisible(false)}
        onSelect={modalOnSelect}
      />
    </SafeAreaView>
  );
};

export default PrivacyPage;

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
  checkupCard: {
    borderRadius: radius._20,
    padding: spacingX._15,
    marginBottom: spacingY._20,
  },
  checkupLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._12,
  },
  checkupText: {
    flex: 1,
    gap: spacingY._4,
  },
  section: { marginBottom: spacingY._20 },
  sectionLabel: { marginBottom: spacingY._10, marginLeft: spacingX._5, letterSpacing: 1 },
  sectionBody: {
    backgroundColor: colors.neutral100,
    borderRadius: radius._15,
    paddingHorizontal: spacingX._15,
  },
});
