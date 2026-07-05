import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";

import SelectorModal from "@/components/SelectorModal";
import SettingItem from "@/components/SettingItem";
import Typo from "@/components/Typo";
import { CHAT_WALLPAPER_PRESETS, createDefaultUserSettings } from "@/constants/userSettings";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useTheme } from "@/context/themeContext";
import { uploadFileToCloudinary } from "@/services/imageService";
import { scale, verticalScale } from "@/utils/styling";

const ChatSettings = () => {
  const { colors: themeColors, setThemePreference } = useTheme();
  const { t, settings, updateSettings } = useAppSettings();
  const router = useRouter();
  const chatSettings = settings?.chats || createDefaultUserSettings().chats;

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalOptions, setModalOptions] = useState<{ label: string; value: string }[]>([]);
  const [modalSelectedValue, setModalSelectedValue] = useState("");
  const [modalOnSelect, setModalOnSelect] = useState<(value: string) => void>(() => {});
  const [uploadingWallpaper, setUploadingWallpaper] = useState(false);

  const themeOptions = [
    { label: t("systemDefault") || "System Default", value: "system" },
    { label: t("light") || "Light", value: "light" },
    { label: t("dark") || "Dark", value: "dark" },
  ];

  const wallpaperOptions = Object.entries(CHAT_WALLPAPER_PRESETS).map(([value, preset]) => ({
    label: preset.label,
    value,
  }));

  const fontSizeOptions = [
    { label: t("small") || "Small", value: "small" },
    { label: t("medium") || "Medium", value: "medium" },
    { label: t("large") || "Large", value: "large" },
  ];

  const backupOptions = [
    { label: "Off", value: "off" },
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" },
  ];

  const transferOptions = [
    { label: "Device to device", value: "device" },
    { label: "Cloud restore", value: "cloud" },
  ];

  const historyOptions = [
    { label: "Keep forever", value: "forever" },
    { label: "1 year", value: "1y" },
    { label: "180 days", value: "180d" },
    { label: "30 days", value: "30d" },
  ];

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

  const getLabel = (value: string, options: { label: string; value: string }[]) =>
    options.find((option) => option.value === value)?.label || value;

  const activeWallpaperPreset = CHAT_WALLPAPER_PRESETS[chatSettings.wallpaperPreset];
  const wallpaperLabel = chatSettings.customWallpaperUrl
    ? "Custom photo"
    : activeWallpaperPreset.label;

  const labels = useMemo(
    () => ({
      theme: getLabel(chatSettings.themePreference, themeOptions),
      fontSize: getLabel(chatSettings.fontSize, fontSizeOptions),
      backup: getLabel(chatSettings.backupFrequency, backupOptions),
      transfer: getLabel(chatSettings.transferMode, transferOptions),
      history: getLabel(chatSettings.historyRetention, historyOptions),
    }),
    [chatSettings]
  );

  const updateChatSettings = async (patch: Partial<typeof chatSettings>) => {
    await updateSettings({ chats: patch });
  };

  const handleThemeChange = async (selected: string) => {
    try {
      await setThemePreference(selected as any);
      await updateChatSettings({ themePreference: selected as any });
    } catch (error) {
      console.log("Error updating theme preference from chats:", error);
      Alert.alert(t("theme") || "Theme", t("somethingWentWrong"));
    }
  };

  const handlePresetWallpaperChange = async (selected: string) => {
    await updateChatSettings({
      wallpaperPreset: selected as any,
      customWallpaperUrl: null,
    });
  };

  const handleUploadWallpaper = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t("chatWallpaper") || "Chat wallpaper", "Gallery permission is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      } as any);

      if (result.canceled || !result.assets?.[0]) return;

      setUploadingWallpaper(true);
      const uploadResult = await uploadFileToCloudinary(
        result.assets[0],
        "chat-wallpapers"
      );

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error(uploadResult.msg || "Could not upload wallpaper");
      }

      await updateChatSettings({
        customWallpaperUrl: uploadResult.data,
      });
    } catch (error: any) {
      Alert.alert(
        t("chatWallpaper") || "Chat wallpaper",
        error?.message || t("somethingWentWrong")
      );
    } finally {
      setUploadingWallpaper(false);
    }
  };

  const handleRemoveCustomWallpaper = async () => {
    await updateChatSettings({
      customWallpaperUrl: null,
    });
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
          {t("chats") || "Chats"}
        </Typo>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: activeWallpaperPreset.backgroundColor,
              borderColor: themeColors.neutral200,
            },
          ]}
        >
          {chatSettings.customWallpaperUrl ? (
            <>
              <Image
                source={{ uri: chatSettings.customWallpaperUrl }}
                contentFit="cover"
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.previewTint} />
            </>
          ) : (
            <>
              <View
                style={[
                  styles.previewOrb,
                  styles.previewOrbTop,
                  { backgroundColor: activeWallpaperPreset.accentColor },
                ]}
              />
              <View
                style={[
                  styles.previewOrb,
                  styles.previewOrbBottom,
                  { backgroundColor: activeWallpaperPreset.bubbleTint },
                ]}
              />
            </>
          )}

          <View style={styles.previewContent}>
            <Typo size={17} fontWeight="700" color={themeColors.white}>
              {wallpaperLabel}
            </Typo>
            <Typo size={13} color={"rgba(255,255,255,0.88)"}>
              Theme, wallpaper, and chat layout preview
            </Typo>
            <View style={styles.previewBubbleRow}>
              <View style={[styles.previewBubble, styles.previewBubbleLeft]}>
                <Typo size={12} color={themeColors.black}>
                  Hello
                </Typo>
              </View>
              <View
                style={[
                  styles.previewBubble,
                  styles.previewBubbleRight,
                  { backgroundColor: themeColors.primary },
                ]}
              >
                <Typo size={12} color={themeColors.white}>
                  Nice wallpaper
                </Typo>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("display") || "DISPLAY"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.Palette}
              title={t("theme") || "Theme"}
              value={labels.theme}
              onPress={() =>
                openSelector(
                  t("theme") || "Theme",
                  themeOptions,
                  chatSettings.themePreference,
                  handleThemeChange
                )
              }
            />
            <SettingItem
              icon={Icons.Image}
              title={t("chatWallpaper") || "Chat Wallpaper"}
              subtitle={chatSettings.customWallpaperUrl ? "Using photo from your gallery" : "Choose a built-in wallpaper preset"}
              value={wallpaperLabel}
              onPress={() =>
                openSelector(
                  t("chatWallpaper") || "Chat Wallpaper",
                  wallpaperOptions,
                  chatSettings.wallpaperPreset,
                  handlePresetWallpaperChange
                )
              }
            />
            <SettingItem
              icon={Icons.UploadSimple}
              title={uploadingWallpaper ? "Uploading wallpaper..." : "Upload from phone"}
              subtitle="Pick an image from your gallery and use it as chat wallpaper"
              onPress={uploadingWallpaper ? undefined : handleUploadWallpaper}
            />
            <SettingItem
              icon={Icons.Trash}
              title="Remove custom wallpaper"
              subtitle="Switch back to the selected built-in wallpaper preset"
              color={chatSettings.customWallpaperUrl ? themeColors.rose : themeColors.neutral400}
              onPress={chatSettings.customWallpaperUrl ? handleRemoveCustomWallpaper : undefined}
              showBorder={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("chatSettings") || "CHAT SETTINGS"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.ArrowElbowDownLeft}
              title={t("enterIsSend") || "Enter is send"}
              subtitle={t("enterIsSendSubtitle") || "Enter key will send your message"}
              isSwitch
              switchValue={chatSettings.enterIsSend}
              onSwitchChange={(value) => updateChatSettings({ enterIsSend: value })}
            />
            <SettingItem
              icon={Icons.Eye}
              title={t("mediaVisibility") || "Media visibility"}
              subtitle={t("mediaVisibilitySubtitle") || "Show newly downloaded media in your device gallery"}
              isSwitch
              switchValue={chatSettings.mediaVisibility}
              onSwitchChange={(value) => updateChatSettings({ mediaVisibility: value })}
            />
            <SettingItem
              icon={Icons.TextT}
              title={t("fontSize") || "Font size"}
              value={labels.fontSize}
              onPress={() =>
                openSelector(
                  t("fontSize") || "Font size",
                  fontSizeOptions,
                  chatSettings.fontSize,
                  (value) => updateChatSettings({ fontSize: value as any })
                )
              }
              showBorder={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("archivedChats") || "ARCHIVED CHATS"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.Archive}
              title={t("keepChatsArchived") || "Keep chats archived"}
              subtitle={t("keepChatsArchivedSubtitle") || "Archived chats remain archived on new messages"}
              isSwitch
              switchValue={chatSettings.keepArchived}
              onSwitchChange={(value) => updateChatSettings({ keepArchived: value })}
              showBorder={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.CloudArrowUp}
              title={t("chatBackup") || "Chat backup"}
              value={labels.backup}
              onPress={() =>
                openSelector("Backup frequency", backupOptions, chatSettings.backupFrequency, (value) =>
                  updateChatSettings({ backupFrequency: value as any })
                )
              }
            />
            <SettingItem
              icon={Icons.VideoCamera}
              title="Include videos"
              subtitle="Back up videos with images and media files"
              isSwitch
              switchValue={chatSettings.backupIncludeVideos}
              onSwitchChange={(value) => updateChatSettings({ backupIncludeVideos: value })}
            />
            <SettingItem
              icon={Icons.DeviceMobile}
              title={t("transferChats") || "Transfer chats"}
              value={labels.transfer}
              onPress={() =>
                openSelector("Transfer mode", transferOptions, chatSettings.transferMode, (value) =>
                  updateChatSettings({ transferMode: value as any })
                )
              }
            />
            <SettingItem
              icon={Icons.CellSignalFull}
              title="Back up over cellular"
              subtitle="Allow backups without Wi-Fi"
              isSwitch
              switchValue={chatSettings.backupOverCellular}
              onSwitchChange={(value) => updateChatSettings({ backupOverCellular: value })}
            />
            <SettingItem
              icon={Icons.ClockCounterClockwise}
              title={t("chatHistory") || "Chat history"}
              value={labels.history}
              onPress={() =>
                openSelector("History retention", historyOptions, chatSettings.historyRetention, (value) =>
                  updateChatSettings({ historyRetention: value as any })
                )
              }
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

export default ChatSettings;

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
  previewCard: {
    height: verticalScale(180),
    borderRadius: radius._20,
    overflow: "hidden",
    marginBottom: spacingY._20,
    borderWidth: 1,
  },
  previewTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 14, 20, 0.28)",
  },
  previewOrb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.8,
  },
  previewOrbTop: {
    width: scale(160),
    height: scale(160),
    top: -scale(40),
    right: -scale(30),
  },
  previewOrbBottom: {
    width: scale(180),
    height: scale(180),
    bottom: -scale(70),
    left: -scale(50),
  },
  previewContent: {
    flex: 1,
    justifyContent: "space-between",
    padding: spacingX._18,
  },
  previewBubbleRow: {
    gap: spacingY._8,
    alignItems: "flex-start",
  },
  previewBubble: {
    maxWidth: "72%",
    paddingHorizontal: spacingX._12,
    paddingVertical: spacingY._8,
    borderRadius: radius._15,
  },
  previewBubbleLeft: {
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  previewBubbleRight: {
    alignSelf: "flex-end",
  },
  section: { marginBottom: spacingY._20 },
  sectionLabel: { marginBottom: spacingY._10, marginLeft: spacingX._5, letterSpacing: 1 },
  sectionBody: {
    backgroundColor: colors.neutral100,
    borderRadius: radius._15,
    paddingHorizontal: spacingX._15,
  },
});
