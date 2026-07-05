import React, { useState, useMemo } from "react";
import {
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";

import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/styling";

interface ThemeColors {
  background?: string;
  white: string;
  text: string;
  primary: string;
  neutral100: string;
  neutral200?: string;
  neutral400: string;
  neutral500: string;
  neutral700: string;
  rose?: string;
  [key: string]: string | undefined;
}

interface LockModalProps {
  visible: boolean;
  chatLocked?: boolean; // New prop: determines if state is locking or unlocking a chat
  onClose: () => void;
  onSubmit: () => void;
  passwordValue: string;
  setPasswordValue: (val: string) => void;
  errorText: string;
  setErrorText: (val: string) => void;
  colors: ThemeColors;
}

const LockChatsModal = ({
  visible,
  chatLocked = false,
  onClose,
  onSubmit,
  passwordValue,
  setPasswordValue,
  errorText,
  setErrorText,
  colors,
}: LockModalProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleTextChange = (value: string) => {
    setPasswordValue(value);
    if (errorText) {
      setErrorText("");
    }
  };

  const handleClose = () => {
    setShowPassword(false);
    setIsFocused(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <View style={styles.passwordCard}>
              
              {/* Header */}
              <View style={styles.headerContainer}>
                <View style={styles.iconCircle}>
                  {chatLocked ? (
                    <Icons.LockOpen
                      size={scale(22)}
                      color={colors.primary}
                      weight="duotone"
                    />
                  ) : (
                    <Icons.LockSimple
                      size={scale(22)}
                      color={colors.primary}
                      weight="duotone"
                    />
                  )}
                </View>

                <Typo size={18} fontWeight="700" color={colors.text}>
                  {chatLocked ? "Unlock Chat" : "Lock Chat"}
                </Typo>

                <Typo size={14} color={colors.neutral500} style={styles.subtitleText}>
                  {chatLocked
                    ? "Enter your chat lock password to remove this chat from Locked chats."
                    : "Enter a password. If this is your first locked chat, it becomes your chat lock password."}
                </Typo>
              </View>

              {/* Password Input */}
              <View
                style={[
                  styles.inputWrapper,
                  isFocused && {
                    borderColor: colors.primary,
                  },
                ]}
              >
                <TextInput
                  secureTextEntry={!showPassword}
                  value={passwordValue}
                  onChangeText={handleTextChange}
                  placeholder="Password"
                  placeholderTextColor={colors.neutral400}
                  style={styles.passwordInput}
                  autoFocus={visible}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onSubmitEditing={onSubmit}
                  returnKeyType="done"
                />

                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.6}
                >
                  {showPassword ? (
                    <Icons.Eye size={scale(20)} color={colors.neutral500} />
                  ) : (
                    <Icons.EyeSlash size={scale(20)} color={colors.neutral500} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Error Alert Container */}
              {!!errorText && (
                <View style={styles.errorContainer}>
                  <Icons.WarningCircle
                    size={scale(16)}
                    color={colors.rose || "#FF3B30"}
                    weight="fill"
                  />
                  <Typo size={13} fontWeight="500" color={colors.rose || "#FF3B30"}>
                    {errorText}
                  </Typo>
                </View>
              )}

              {/* Action Sheet Footer Buttons */}
              <View style={styles.passwordActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Typo fontWeight="600" color={colors.neutral700}>
                    Cancel
                  </Typo>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={onSubmit}
                  activeOpacity={0.8}
                >
                  <Typo fontWeight="600" color={colors.white}>
                    {chatLocked ? "Unlock" : "Lock"}
                  </Typo>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default React.memo(LockChatsModal);

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacingX._20,
    },
    keyboardView: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    passwordCard: {
      width: "100%",
      maxWidth: scale(335),
      backgroundColor: colors.white,
      borderRadius: radius._17,
      paddingHorizontal: scale(22),
      paddingVertical: scale(24),
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 6,
    },
    headerContainer: {
      alignItems: "center",
      marginBottom: spacingY._17,
    },
    iconCircle: {
      width: scale(50),
      height: scale(50),
      borderRadius: scale(25),
      backgroundColor: colors.primary
        ? `${colors.primary}15`
        : "rgba(0,122,255,0.10)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacingY._10,
    },
    subtitleText: {
      textAlign: "center",
      marginTop: spacingY._7,
      lineHeight: scale(19),
      paddingHorizontal: scale(4),
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.neutral100,
      borderRadius: radius._12,
      borderWidth: 1.3,
      borderColor: colors.neutral200 || "transparent",
      height: verticalScale(50),
      paddingLeft: spacingX._15,
    },
    passwordInput: {
      flex: 1,
      height: verticalScale(50),
      paddingHorizontal: spacingX._7,
      paddingVertical: 0,
      fontSize: scale(15),
      color: colors.text,
      textAlignVertical: "center",
      includeFontPadding: false,
      fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
    },
    eyeIcon: {
      paddingHorizontal: spacingX._15,
      justifyContent: "center",
      alignItems: "center",
      height: "100%",
    },
    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacingY._7,
      paddingHorizontal: spacingX._3,
      gap: scale(5),
    },
    passwordActions: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacingY._20,
      gap: scale(10),
    },
    cancelButton: {
      flex: 1,
      height: verticalScale(46),
      justifyContent: "center",
      alignItems: "center",
      borderRadius: radius._12,
      backgroundColor: colors.neutral100,
    },
    submitButton: {
      flex: 1,
      height: verticalScale(46),
      justifyContent: "center",
      alignItems: "center",
      borderRadius: radius._12,
      backgroundColor: colors.primary,
    },
  });