import React, { createContext, ReactNode, useContext, useMemo, useState, useCallback, useEffect } from "react";
import { Modal, Pressable, StyleSheet, TouchableOpacity, View, BackHandler } from "react-native";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { CustomAlertButton, CustomAlertContextProps, CustomAlertOptions } from "@/types";
import { scale, verticalScale } from "@/utils/styling";

const CustomAlertContext = createContext<CustomAlertContextProps | undefined>(undefined);

const getVariantStyles = (
  variant: NonNullable<CustomAlertOptions["variant"]>,
  themeColors: ReturnType<typeof useTheme>["colors"]
) => {
  switch (variant) {
    case "success":
      return { icon: Icons.CheckCircle, iconColor: themeColors.white || "#FFFFFF", iconBackground: themeColors.green };
    case "warning":
      return { icon: Icons.WarningCircle, iconColor: themeColors.neutral900 || "#000000", iconBackground: themeColors.primary };
    case "danger":
      return { icon: Icons.WarningOctagon, iconColor: themeColors.white || "#FFFFFF", iconBackground: themeColors.rose };
    default:
      return { icon: Icons.Info, iconColor: themeColors.white || "#FFFFFF", iconBackground: themeColors.neutral700 };
  }
};

interface AlertCardProps {
  options: CustomAlertOptions;
  onClose: () => void;
}

const AlertCard = React.memo(({ options, onClose }: AlertCardProps) => {
  const { colors: themeColors, isDark } = useTheme();
  const variant = getVariantStyles(options.variant || "info", themeColors);
  const Icon = variant.icon;

  const buttons = useMemo(() => {
    return options.buttons?.length ? options.buttons : [{ text: "OK", style: "default" as const }];
  }, [options.buttons]);

  const handleDismiss = useCallback(() => {
    if (options.dismissible !== false) {
      onClose();
      return true;
    }
    return false;
  }, [options.dismissible, onClose]);

  // Handle hardware back button on Android explicitly
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (options.dismissible === false) {
        // Intercept and do nothing (block minimizing/going back)
        return true; 
      }
      handleDismiss();
      return true;
    });

    return () => backHandler.remove();
  }, [handleDismiss, options.dismissible]);

  const handlePress = useCallback((button: CustomAlertButton) => {
    onClose();
    requestAnimationFrame(() => {
      void button.onPress?.();
    });
  }, [onClose]);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      {/* Semi-transparent overlay altered slightly for better dark mode aesthetics */}
      <Pressable 
        style={[
          styles.overlay, 
          { backgroundColor: isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(17, 24, 39, 0.45)" }
        ]} 
        onPress={handleDismiss}
      >
        <Pressable
          style={[styles.card, { backgroundColor:  themeColors.white }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={[styles.iconWrap, { backgroundColor: variant.iconBackground }]}>
            <Icon size={scale(28)} color={variant.iconColor} weight="fill" />
          </View>

          <View style={styles.content}>
            <Typo size={22} fontWeight="700" color={themeColors.text} style={styles.title}>
              {options.title}
            </Typo>
            {!!options.message && (
              <Typo size={15} color={themeColors.neutral500} style={styles.message}>
                {options.message}
              </Typo>
            )}
          </View>

          <View style={[styles.buttonContainer, buttons.length > 2 && styles.buttonContainerVertical]}>
            {buttons.map((button, index) => {
              const isDestructive = button.style === "destructive";
              const isCancel = button.style === "cancel";

              // Dynamically resolve background color based on button intent and theme
              const buttonBgColor = isDestructive
                ? themeColors.rose
                : isCancel
                  ? (isDark ? themeColors.neutral800 : themeColors.neutral100)
                  : themeColors.primary;

              // Dynamically resolve text color so cancel button labels don't blend into light background
              const buttonTextColor = isCancel
                ? (isDark ? themeColors.neutral200 : themeColors.neutral800)
                : (isDark ? themeColors.neutral900 : themeColors.white);

              return (
                <TouchableOpacity
                  key={`${button.text}-${index}`}
                  activeOpacity={0.85}
                  onPress={() => handlePress(button)}
                  style={[
                    styles.button,
                    buttons.length <= 2 && styles.buttonSideBySide,
                    { backgroundColor: buttonBgColor },
                  ]}
                >
                  <Typo
                    size={15}
                    fontWeight="700"
                    color={buttonTextColor}
                  >
                    {button.text}
                  </Typo>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

AlertCard.displayName = "AlertCard";

export const CustomAlertProvider = ({ children }: { children: ReactNode }) => {
  const [options, setOptions] = useState<CustomAlertOptions | null>(null);

  const showAlert = useCallback((nextOptions: CustomAlertOptions) => setOptions(nextOptions), []);
  const hideAlert = useCallback(() => setOptions(null), []);

  const value = useMemo<CustomAlertContextProps>(
    () => ({ showAlert, hideAlert }),
    [showAlert, hideAlert]
  );

  return (
    <CustomAlertContext.Provider value={value}>
      {children}
      {options && <AlertCard options={options} onClose={hideAlert} />}
    </CustomAlertContext.Provider>
  );
};

export const useCustomAlert = () => {
  const context = useContext(CustomAlertContext);
  if (!context) {
    throw new Error("useCustomAlert must be used within a CustomAlertProvider");
  }
  return context;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacingX._20,
  },
  card: {
    width: "100%",
    borderRadius: radius._30,
    paddingHorizontal: spacingX._20,
    paddingTop: spacingY._25,
    paddingBottom: spacingY._20,
    alignItems: "center",
  },
  iconWrap: {
    width: scale(62),
    height: scale(62),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacingY._15,
  },
  content: {
    width: "100%",
    alignItems: "center",
    marginBottom: spacingY._20,
  },
  title: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    marginTop: spacingY._10,
    lineHeight: verticalScale(22),
  },
  buttonContainer: {
    width: "100%",
    flexDirection: "row",
    gap: spacingX._10,
  },
  buttonContainerVertical: {
    flexDirection: "column",
    gap: spacingY._10,
  },
  button: {
    minHeight: verticalScale(52),
    borderRadius: radius._17,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacingX._20,
  },
  buttonSideBySide: {
    flex: 1,
  },
});