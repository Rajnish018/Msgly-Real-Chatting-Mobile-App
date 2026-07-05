import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { scale, verticalScale } from "@/utils/styling";
import SelectorModal from "@/components/SelectorModal";

import { playTonePreview, playRingtonePreview } from "@/utils/soundHelper";

const NotificationsPage = () => {
  const { colors } = useTheme();
  const { t, settings, updateSettings, toggleConversationMute, isConversationMuted } = useAppSettings();
  const router = useRouter();
  const params = useLocalSearchParams();

  // console.log("Received params in NotificationsPage:", params);
  const conversationId = params.conversationId as string | undefined;

  // Global Context State Evaluation
  const conversationMuted = conversationId ? isConversationMuted(conversationId) : false;

  // Local UI States
  const [muteStatus, setMuteStatus] = useState(false);
  const tone = settings.notifications.messages.tone;
  const vibrate = settings.notifications.messages.vibrate;
  const callVibrate = settings.notifications.calls.vibrate;
  const ringtone = settings.notifications.calls.ringtone;

  const [activeModal, setActiveModal] = useState<"tone" | "vibrate" | "callVibrate" | "ringtone" | null>(null);

  const toneOptions = [
    { label: "None / Silent", value: "none" },
    { label: "Default", value: "default" },
    { label: "Chime", value: "chime" },
    { label: "Reflection", value: "reflection" },
  ];

  const vibrateOptions = [
    { label: "Off", value: "off" },
    { label: "Default", value: "default" },
    { label: "Short", value: "short" },
    { label: "Long", value: "long" },
  ];

  const ringtoneOptions = [
    { label: "Default", value: "default" },
    { label: "Chime", value: "chime" },
    { label: "Reflection", value: "reflection" },
    { label: "None / Silent", value: "none" },
  ];

  const getLabel = (value: string, options: { label: string; value: string }[]) =>
    options.find((option) => option.value === value)?.label || value;

  const handleMuteToggle = async () => {
    if (conversationId) {
      await toggleConversationMute(conversationId);
    } else {
      console.warn("No conversationId provided to toggle individual conversation muting.");
      // Fallback: If you have a global settings toggle mechanism, invoke it here
    }
  };

  const triggerVibrateHaptic = async (vibrateType: string) => {
    try {
      const Haptics = await import("expo-haptics");
      if (vibrateType === "short") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (vibrateType === "long") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (vibrateType === "default") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (e) {
      console.warn("Haptics native module not available in this build.");
    }
  };

  const SettingItem = ({
    icon: Icon,
    title,
    value,
    onPress,
    isToggle,
    toggleValue,
    onToggle,
    showBorder = true
  }: any) => (
    <View style={[styles.item, { borderBottomColor: colors.neutral200 }, !showBorder && { borderBottomWidth: 0 }]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={isToggle ? onToggle : onPress}
        style={styles.itemLeft}
      >
        <Icon size={scale(22)} color={colors.text} weight="regular" />
        <View style={styles.textContainer}>
          <Typo size={16} fontWeight="500">{title}</Typo>
        </View>
      </TouchableOpacity>

      <View style={styles.itemRight}>
        {isToggle ? (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ false: colors.neutral300, true: colors.primary }}
            thumbColor={colors.white}
          />
        ) : (
          <TouchableOpacity onPress={onPress} style={styles.selectorRow}>
            {value && <Typo color={colors.primary} size={14} fontWeight="600">{value}</Typo>}
            <Icons.CaretRight size={scale(16)} color={colors.neutral400} weight="bold" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.white }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.neutral100 }]}>
          <Icons.CaretLeft size={scale(24)} color={colors.black} weight="bold" />
        </TouchableOpacity>
        <Typo size={20} fontWeight="700">{t("notifications") || "Notifications"}</Typo>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* MESSAGES SECTION */}
        <View style={styles.section}>
          <Typo size={13} color={colors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("messages") || "MESSAGES"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: colors.neutral100 }]}>
            <SettingItem
              icon={Icons.BellSlash}
              title={conversationId ? "Mute This Conversation" : "Mute Notifications"}
              isToggle={true}
              toggleValue={conversationMuted}
              onToggle={handleMuteToggle}
            />
            <SettingItem
              icon={Icons.MusicNote}
              title="Notification Tone"
              value={getLabel(tone, toneOptions)}
              onPress={() => setActiveModal("tone")}
            />
            <SettingItem
              icon={Icons.Vibrate}
              title="Vibrate"
              value={getLabel(vibrate, vibrateOptions)}
              onPress={() => setActiveModal("vibrate")}
              showBorder={false}
            />
          </View>
        </View>

        {/* ADVANCED CALL SETTINGS */}
        <View style={styles.section}>
          <Typo size={13} color={colors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("advancedCallSettings") || "ADVANCED CALL SETTINGS"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: colors.neutral100 }]}>
            <SettingItem
              icon={Icons.PhoneCall}
              title="Ringtone"
              value={getLabel(ringtone, ringtoneOptions)}
              onPress={() => setActiveModal("ringtone")}
            />
            <SettingItem
              icon={Icons.Vibrate}
              title="Vibrate"
              value={getLabel(callVibrate, vibrateOptions)}
              onPress={() => setActiveModal("callVibrate")}
              showBorder={false}
            />
          </View>
        </View>

        <View style={[styles.separator, { backgroundColor: colors.neutral100 }]} />

        {/* STATUS SECTION */}
        <View style={styles.section}>
          <Typo size={13} color={colors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("statusUpdates") || "STATUS"}
          </Typo>
          <View style={[styles.sectionBody, { backgroundColor: colors.neutral100 }]}>
            <SettingItem
              icon={Icons.CircleDashed}
              title="Mute Status Updates"
              isToggle={true}
              toggleValue={muteStatus}
              onToggle={() => setMuteStatus(!muteStatus)}
              showBorder={false}
            />
          </View>
        </View>

      </ScrollView>

      {/* Modals */}
      <SelectorModal
        visible={activeModal === "tone"}
        title="Notification Tone"
        options={toneOptions}
        selectedValue={tone}
        onClose={() => setActiveModal(null)}
        onSelect={(val) => {
          updateSettings({ notifications: { messages: { tone: val as any } } } as any);
          void playTonePreview(val);
        }}
      />

      <SelectorModal
        visible={activeModal === "vibrate"}
        title="Vibration"
        options={vibrateOptions}
        selectedValue={vibrate}
        onClose={() => setActiveModal(null)}
        onSelect={(val) => {
          updateSettings({ notifications: { messages: { vibrate: val as any } } } as any);
          void triggerVibrateHaptic(val);
        }}
      />

      <SelectorModal
        visible={activeModal === "callVibrate"}
        title="Call Vibration"
        options={vibrateOptions}
        selectedValue={callVibrate}
        onClose={() => setActiveModal(null)}
        onSelect={(val) => {
          updateSettings({ notifications: { calls: { vibrate: val as any } } } as any);
          void triggerVibrateHaptic(val);
        }}
      />

      <SelectorModal
        visible={activeModal === "ringtone"}
        title="Ringtone"
        options={ringtoneOptions}
        selectedValue={ringtone}
        onClose={() => setActiveModal(null)}
        onSelect={(val) => {
          updateSettings({ notifications: { calls: { ringtone: val as any } } } as any);
          void playRingtonePreview(val);
        }}
      />
    </SafeAreaView>
  );
};

export default NotificationsPage;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingX._20,
    paddingVertical: spacingY._15,
  },
  backButton: {
    padding: scale(8),
    borderRadius: radius._10,
  },
  scrollContent: { paddingHorizontal: spacingX._20, paddingBottom: verticalScale(40) },
  section: { marginBottom: spacingY._20 },
  sectionLabel: { marginBottom: spacingY._10, marginLeft: spacingX._5, letterSpacing: 1 },
  sectionBody: {
    borderRadius: radius._15,
    paddingHorizontal: spacingX._15,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacingY._17,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  textContainer: {
    marginLeft: scale(12),
    flex: 1,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  separator: {
    height: 1,
    width: "100%",
    marginBottom: spacingY._20,
    opacity: 0.5,
  }
});
