import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import SelectorModal from "@/components/SelectorModal";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { scale, verticalScale } from "@/utils/styling";

const FeedbackForm = () => {
  const { colors: themeColors } = useTheme();
  const { t } = useAppSettings();
  const router = useRouter();

  // FORM STATES
  const [category, setCategory] = useState("bug");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const MAX_CHARS = 500;

  const categories = [
    { label: t("reportBug") || "Report a Bug", value: "bug" },
    { label: t("suggestion") || "Feature Suggestion", value: "suggestion" },
    { label: t("generalFeedback") || "General Feedback", value: "general" },
    { label: t("other") || "Other", value: "other" },
  ];

  const handleSubmit = async () => {
    if (message.trim().length < 10) {
      Alert.alert(t("error"), t("feedbackTooShort") || "Please provide at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API Call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        t("thankYou"), 
        t("feedbackSuccess") || "Your feedback has been sent successfully!",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }, 2000);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.white }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icons.CaretLeft size={scale(24)} color={themeColors.black} weight="bold" />
          </TouchableOpacity>
          <Typo size={20} fontWeight="700">{t("sendFeedback") || "Send Feedback"}</Typo>
          <View style={{ width: scale(40) }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <Typo size={16} color={themeColors.neutral500} style={styles.introText}>
            {t("feedbackIntro") || "Have a suggestion or found a bug? We'd love to hear from you."}
          </Typo>

          {/* CATEGORY SELECTOR */}
          <View style={styles.inputGroup}>
            <Typo size={14} fontWeight="600" style={styles.label}>{t("category") || "CATEGORY"}</Typo>
            <TouchableOpacity 
              style={[styles.selectorTrigger, { backgroundColor: themeColors.neutral100 }]}
              onPress={() => setIsModalVisible(true)}
            >
              <Typo size={15}>
                {categories.find(c => c.value === category)?.label}
              </Typo>
              <Icons.CaretDown size={scale(18)} color={themeColors.neutral500} />
            </TouchableOpacity>
          </View>

          {/* MESSAGE INPUT */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Typo size={14} fontWeight="600" style={styles.label}>{t("message") || "MESSAGE"}</Typo>
              <Typo size={12} color={message.length > MAX_CHARS ? colors.rose : themeColors.neutral400}>
                {message.length}/{MAX_CHARS}
              </Typo>
            </View>
            <TextInput
              multiline
              numberOfLines={6}
              placeholder={t("feedbackPlaceholder") || "Describe your experience here..."}
              placeholderTextColor={themeColors.neutral400}
              value={message}
              onChangeText={setMessage}
              maxLength={MAX_CHARS}
              style={[
                styles.textArea, 
                { 
                  backgroundColor: themeColors.neutral100, 
                  color: themeColors.black,
                  textAlignVertical: 'top' 
                }
              ]}
            />
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              { backgroundColor: themeColors.primary },
              (isSubmitting || message.length < 10) && { opacity: 0.6 }
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || message.length < 10}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Typo color={colors.white} fontWeight="700" size={16}>
                {t("submitFeedback") || "Submit Feedback"}
              </Typo>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <SelectorModal
        visible={isModalVisible}
        title={t("selectCategory") || "Select Category"}
        options={categories}
        selectedValue={category}
        onClose={() => setIsModalVisible(false)}
        onSelect={(val) => setCategory(val)}
      />
    </SafeAreaView>
  );
};

export default FeedbackForm;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingX._20,
    paddingVertical: spacingY._15,
  },
  backButton: { padding: scale(8) },
  scrollContent: { paddingHorizontal: spacingX._20, paddingTop: spacingY._10 },
  introText: { marginBottom: spacingY._25, lineHeight: 22 },
  inputGroup: { marginBottom: spacingY._20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { marginBottom: spacingY._7, marginLeft: spacingX._5 },
  selectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacingX._15,
    borderRadius: radius._12,
  },
  textArea: {
    padding: spacingX._15,
    borderRadius: radius._12,
    height: verticalScale(150),
    fontSize: scale(15),
  },
  submitButton: {
    height: verticalScale(54),
    borderRadius: radius._15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacingY._10,
    marginBottom: spacingY._30,
    flexDirection: 'row',
  }
});