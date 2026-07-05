import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SelectorModal from "@/components/SelectorModal";
import SettingItem from "@/components/SettingItem";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useTheme } from "@/context/themeContext";
import { scale, verticalScale } from "@/utils/styling";

const toneOptions = [
  { label: "Default Ringtone", value: "default" },
  { label: "Chime", value: "chime" },
  { label: "Reflection", value: "reflection" },
  { label: "None / Silent", value: "none" },
];

const vibrateOptions = [
  { label: "Off", value: "off" },
  { label: "Default", value: "default" },
  { label: "Short", value: "short" },
  { label: "Long", value: "long" },
];

const lightOptions = [
  { label: "None", value: "none" },
  { label: "White", value: "white" },
  { label: "Red", value: "red" },
  { label: "Blue", value: "blue" },
  { label: "Green", value: "green" },
];

const getLabel = (value: string, options: { label: string; value: string }[]) =>
  options.find((option) => option.value === value)?.label || value;

const NotificationSettings = () => {
  const { colors: themeColors } = useTheme();
  const { t, settings, updateSettings } = useAppSettings();
  const router = useRouter();
  const notificationSettings = settings.notifications;
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalOptions, setModalOptions] = useState<{ label: string; value: string }[]>([]);
  const [modalSelectedValue, setModalSelectedValue] = useState("");
  const [modalOnSelect, setModalOnSelect] = useState<(value: string) => void>(() => {});

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

  const toggleValue = async (
    channel: "messages" | "groups",
    key: "highPriority" | "reactionNotifications",
    value: boolean
  ) => {
    await updateSettings({
      notifications: {
        [channel]: {
          [key]: value,
        },
      },
    } as any);
  };

  const sections = useMemo(
    () => ({
      messageTone: getLabel(notificationSettings.messages.tone, toneOptions),
      messageVibrate: getLabel(notificationSettings.messages.vibrate, vibrateOptions),
      messageLight: getLabel(notificationSettings.messages.light, lightOptions),
      groupTone: getLabel(notificationSettings.groups.tone, toneOptions),
      groupVibrate: getLabel(notificationSettings.groups.vibrate, vibrateOptions),
      groupLight: getLabel(notificationSettings.groups.light, lightOptions),
      callTone: getLabel(notificationSettings.calls.ringtone, toneOptions),
      callVibrate: getLabel(notificationSettings.calls.vibrate, vibrateOptions),
    }),
    [notificationSettings]
  );

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
          {t("notifications") || "Notifications"}
        </Typo>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.SpeakerHigh}
              title={t("conversationTones") || "Conversation tones"}
              subtitle={t("conversationTonesDesc") || "Play sounds for incoming and outgoing messages"}
              isSwitch
              switchValue={notificationSettings.conversationTones}
              onSwitchChange={(value) =>
                updateSettings({ notifications: { conversationTones: value } })
              }
            />
            <SettingItem
              icon={Icons.Hourglass}
              title={t("reminders") || "Reminders"}
              subtitle={t("remindersDesc") || "Receive occasional alerts for unread notifications"}
              isSwitch
              switchValue={notificationSettings.reminders}
              onSwitchChange={(value) => updateSettings({ notifications: { reminders: value } })}
              showBorder={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("messages") || "MESSAGES"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.MusicNote}
              title={t("notificationTone") || "Notification tone"}
              value={sections.messageTone}
              onPress={() =>
                openSelector("Message Tone", toneOptions, notificationSettings.messages.tone, (value) =>
                  updateSettings({ notifications: { messages: { tone: value as any } } })
                )
              }
            />
            <SettingItem
              icon={Icons.Vibrate}
              title={t("vibrate") || "Vibrate"}
              value={sections.messageVibrate}
              onPress={() =>
                openSelector("Message Vibrate", vibrateOptions, notificationSettings.messages.vibrate, (value) =>
                  updateSettings({ notifications: { messages: { vibrate: value as any } } })
                )
              }
            />
            <SettingItem
              icon={Icons.Lightbulb}
              title={t("light") || "Light"}
              value={sections.messageLight}
              onPress={() =>
                openSelector("Message Light", lightOptions, notificationSettings.messages.light, (value) =>
                  updateSettings({ notifications: { messages: { light: value as any } } })
                )
              }
            />
            <SettingItem
              icon={Icons.WarningCircle}
              title={t("useHighPriority") || "Use high priority notifications"}
              subtitle={t("highPriorityDesc") || "Show notifications at the top of the screen"}
              isSwitch
              switchValue={notificationSettings.messages.highPriority}
              onSwitchChange={(value) => toggleValue("messages", "highPriority", value)}
            />
            <SettingItem
              icon={Icons.ThumbsUp}
              title={t("reactionNotifications") || "Reaction notifications"}
              subtitle={t("reactionNotificationsDesc") || "Get notified when someone reacts to your messages"}
              isSwitch
              switchValue={notificationSettings.messages.reactionNotifications}
              onSwitchChange={(value) => toggleValue("messages", "reactionNotifications", value)}
              showBorder={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("groups") || "GROUPS"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.MusicNote}
              title={t("groupNotificationTone") || "Notification tone"}
              value={sections.groupTone}
              onPress={() =>
                openSelector("Group Tone", toneOptions, notificationSettings.groups.tone, (value) =>
                  updateSettings({ notifications: { groups: { tone: value as any } } })
                )
              }
            />
            <SettingItem
              icon={Icons.Vibrate}
              title={t("groupVibrate") || "Vibrate"}
              value={sections.groupVibrate}
              onPress={() =>
                openSelector("Group Vibrate", vibrateOptions, notificationSettings.groups.vibrate, (value) =>
                  updateSettings({ notifications: { groups: { vibrate: value as any } } })
                )
              }
            />
            <SettingItem
              icon={Icons.Lightbulb}
              title={t("groupLight") || "Light"}
              value={sections.groupLight}
              onPress={() =>
                openSelector("Group Light", lightOptions, notificationSettings.groups.light, (value) =>
                  updateSettings({ notifications: { groups: { light: value as any } } })
                )
              }
            />
            <SettingItem
              icon={Icons.WarningCircle}
              title={t("groupHighPriority") || "Use high priority notifications"}
              subtitle={t("groupHighPriorityDesc") || "Show group notifications at the top of the screen"}
              isSwitch
              switchValue={notificationSettings.groups.highPriority}
              onSwitchChange={(value) => toggleValue("groups", "highPriority", value)}
            />
            <SettingItem
              icon={Icons.ThumbsUp}
              title={t("groupReactionNotifications") || "Reaction notifications"}
              subtitle={t("groupReactionDesc") || "Get notified when someone reacts to messages in groups"}
              isSwitch
              switchValue={notificationSettings.groups.reactionNotifications}
              onSwitchChange={(value) => toggleValue("groups", "reactionNotifications", value)}
              showBorder={false}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("calls") || "CALLS"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: themeColors.neutral100 }]}>
            <SettingItem
              icon={Icons.PhoneCall}
              title={t("ringtone") || "Ringtone"}
              value={sections.callTone}
              onPress={() =>
                openSelector("Call Ringtone", toneOptions, notificationSettings.calls.ringtone, (value) =>
                  updateSettings({ notifications: { calls: { ringtone: value as any } } })
                )
              }
            />
            <SettingItem
              icon={Icons.Vibrate}
              title={t("callVibrate") || "Vibrate"}
              value={sections.callVibrate}
              onPress={() =>
                openSelector("Call Vibrate", vibrateOptions, notificationSettings.calls.vibrate, (value) =>
                  updateSettings({ notifications: { calls: { vibrate: value as any } } })
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

export default NotificationSettings;

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
  section: { marginBottom: spacingY._20 },
  sectionLabel: { marginBottom: spacingY._10, marginLeft: spacingX._5, letterSpacing: 1 },
  sectionBody: {
    backgroundColor: colors.neutral100,
    borderRadius: radius._15,
    paddingHorizontal: spacingX._15,
  },
});
