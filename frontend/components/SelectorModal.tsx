import React, { useState, useEffect } from "react";
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { scale } from "@/utils/styling";

interface SelectorOption {
  label: string;
  value: string;
}

interface SelectorModalProps {
  visible: boolean;
  title: string;
  options: SelectorOption[];
  selectedValue: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}

const SelectorModal = ({
  visible,
  title,
  options,
  selectedValue,
  cancelLabel = "Cancel",
  confirmLabel = "OK",
  onClose,
  onSelect,
}: SelectorModalProps) => {
  const { colors: themeColors } = useTheme();
  const [localSelected, setLocalSelected] = useState(selectedValue);

  useEffect(() => {
    if (visible) {
      setLocalSelected(selectedValue);
    }
  }, [visible, selectedValue]);

  const handleConfirm = () => {
    onSelect(localSelected);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: themeColors.neutral100 || colors.neutral100 }]}>
              
              {/* HEADER TITLE */}
              <View style={styles.header}>
                <Typo size={18} fontWeight="700">
                  {title}
                </Typo>
              </View>

              {/* OPTIONS LIST */}
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={styles.listContainer}
              >
                {options.map((item) => {
                  const isSelected = localSelected === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      activeOpacity={1}
                      onPress={() => setLocalSelected(item.value)}
                      style={styles.optionRow}
                    >
                      <Typo size={16} fontWeight="500">
                        {item.label}
                      </Typo>
                      
                      {/* CIRCLE CHECKBOX */}
                      <View style={styles.circleOuter}>
                        {isSelected && (
                          <View style={[styles.circleInner, { backgroundColor: themeColors.primary }]} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* FOOTER BUTTONS */}
              <View style={styles.footer}>
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Typo color={themeColors.neutral500} fontWeight="600" size={15}>
                    {cancelLabel}
                  </Typo>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.button} 
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Typo color={themeColors.primary} fontWeight="700" size={15}>
                    {confirmLabel}
                  </Typo>
                </TouchableOpacity>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default SelectorModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacingX._30,
  },
  modalContent: {
    width: "100%",
    maxHeight: "70%",
    borderRadius: radius._20,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    paddingHorizontal: spacingX._20,
    paddingTop: spacingY._20,
    paddingBottom: spacingY._10,
  },
  listContainer: {
    paddingHorizontal: spacingX._20,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacingY._15,
  },
  circleOuter: {
    height: scale(20),
    width: scale(20),
    borderRadius: scale(10),
    borderWidth: 2,
    borderColor: colors.neutral400,
    alignItems: "center",
    justifyContent: "center",
  },
  circleInner: {
    height: scale(10),
    width: scale(10),
    borderRadius: scale(5),
  },
  footer: {
    flexDirection: "row",
    marginTop: spacingY._10,
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacingY._15,
  },
});