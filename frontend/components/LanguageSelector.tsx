import React from "react";
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import { LANGUAGE_OPTIONS } from "@/constants/languages";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { AppLanguage } from "@/types";
import { scale } from "@/utils/styling";

type LanguageSelectorProps = {
  visible: boolean;
  selectedLanguage: AppLanguage;
  title: string;
  cancelLabel: string;
  getOptionLabel: (language: AppLanguage) => string;
  onClose: () => void;
  onSelect: (language: AppLanguage) => void | Promise<void>;
};

const LanguageSelector = ({
  visible,
  selectedLanguage,
  title,
  cancelLabel,
  getOptionLabel,
  onClose,
  onSelect,
}: LanguageSelectorProps) => {
  const { colors: themeColors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: themeColors.white }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.header}>
            <Typo size={18} fontWeight="700">
              {title}
            </Typo>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: themeColors.neutral100 }]}>
              <Icons.X size={scale(18)} color={themeColors.neutral700} weight="bold" />
            </TouchableOpacity>
          </View>

          <View style={[styles.list, { borderColor: themeColors.neutral200 }]}>
            {LANGUAGE_OPTIONS.map((option, index) => {
              const isSelected = option.code === selectedLanguage;

              return (
                <TouchableOpacity
                  key={option.code}
                  activeOpacity={0.8}
                  onPress={() => {
                    onSelect(option.code);
                    onClose();
                  }}
                  style={[
                    styles.optionRow,
                    { borderBottomColor: themeColors.neutral200 },
                    index === LANGUAGE_OPTIONS.length - 1 && styles.lastOptionRow,
                  ]}
                >
                  <View style={styles.optionText}>
                    <Typo size={16} fontWeight="600">
                      {option.nativeLabel}
                    </Typo>
                    <Typo size={13} color={themeColors.neutral500}>
                      {getOptionLabel(option.code)}
                    </Typo>
                  </View>

                  {isSelected ? (
                    <View style={[styles.selectedBadge, { backgroundColor: themeColors.primary }]}>
                      <Icons.Check size={scale(14)} color={colors.black} weight="bold" />
                    </View>
                  ) : (
                    <View style={[styles.unselectedBadge, { borderColor: themeColors.neutral300 }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={[styles.cancelButton, { backgroundColor: themeColors.neutral100 }]}
          >
            <Typo size={15} fontWeight="600">
              {cancelLabel}
            </Typo>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default LanguageSelector;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
    paddingHorizontal: spacingX._20,
    paddingBottom: spacingY._25,
  },
  sheet: {
    borderRadius: radius._20,
    padding: spacingX._20,
    gap: spacingY._15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeButton: {
    width: scale(34),
    height: scale(34),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    borderWidth: 1,
    borderRadius: radius._15,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingX._15,
    paddingVertical: spacingY._15,
    borderBottomWidth: 1,
  },
  lastOptionRow: {
    borderBottomWidth: 0,
  },
  optionText: {
    flex: 1,
    gap: spacingY._5,
  },
  selectedBadge: {
    width: scale(24),
    height: scale(24),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  unselectedBadge: {
    width: scale(24),
    height: scale(24),
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  cancelButton: {
    borderRadius: radius._15,
    paddingVertical: spacingY._15,
    alignItems: "center",
  },
});
