import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import * as Icons from "phosphor-react-native";

import Avatar from "@/components/Avatar";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import {
  registerForegroundNotificationPresenter,
  unregisterForegroundNotificationPresenter,
} from "@/services/foregroundNotificationBridge";
import { ForegroundNotificationPayload } from "@/types";
import { scale, verticalScale } from "@/utils/styling";

const DISPLAY_DURATION = 4500;

export const ForegroundNotificationProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { colors: themeColors } = useTheme();
  const translateY = useRef(new Animated.Value(-220)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notification, setNotification] = useState<ForegroundNotificationPayload | null>(null);

  // Modern devices with notches/dynamic islands require balanced padding
  const topOffset = Platform.OS === "android" ? spacingY._25 : spacingY._50;

  const hideBanner = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -220,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setNotification(null);
      }
    });
  };

  useEffect(() => {
    const presentNotification = (payload: ForegroundNotificationPayload) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      translateY.stopAnimation();
      opacity.stopAnimation();
      setNotification(payload);

      translateY.setValue(-220);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 9, // Slightly bouncier, premium spring physics
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      timeoutRef.current = setTimeout(() => {
        hideBanner();
      }, DISPLAY_DURATION);
    };

    registerForegroundNotificationPresenter(presentNotification);

    return () => {
      unregisterForegroundNotificationPresenter(presentNotification);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [opacity, translateY]);

  return (
    <>
      {children}

      <View pointerEvents="box-none" style={styles.overlay}>
        {notification ? (
          <Animated.View
            style={[
              styles.bannerWrap,
              {
                paddingTop: topOffset,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            <Pressable
              style={[
                styles.banner,
                {
                  backgroundColor: themeColors.white,
                  borderColor: themeColors.neutral200,
                  shadowColor: themeColors.black,
                },
              ]}
              onPress={hideBanner}
            >
              <View style={styles.bannerContent}>
                {/* Left accent color strip */}
                {/* <View style={[styles.leftAccentIndicator, { backgroundColor: themeColors.primary }]} /> */}

                {/* Main Row */}
                <View style={styles.innerContent}>
                  {notification.avatarUrl ? (
                    <Avatar uri={notification.avatarUrl} size={42} />
                  ) : (
                    <View style={[styles.iconAvatar, { backgroundColor: `${themeColors.primary}15` }]}>
                      <Icons.ChatCircleDots size={scale(20)} color={themeColors.primary} weight="duotone" />
                    </View>
                  )}

                  <View style={styles.textBlock}>
                    <View style={styles.metaRow}>
                      <Typo size={11} fontWeight="700" color={themeColors.neutral500} style={styles.tagText}>
                        {notification.tag?.toUpperCase() || "NOTIFICATION"}
                      </Typo>

                      <TouchableOpacity onPress={hideBanner} hitSlop={15} style={styles.closeButton}>
                        <Icons.X size={scale(14)} color={themeColors.neutral400} weight="bold" />
                      </TouchableOpacity>
                    </View>

                    <Typo size={14} fontWeight="700" color={themeColors.neutral900} textProps={{ numberOfLines: 1 }}>
                      {notification.title}
                    </Typo>

                    {!!notification.body && (
                      <Typo
                        size={12.5}
                        color={themeColors.neutral600}
                        style={styles.bodyText}
                        textProps={{ numberOfLines: 2 }}
                      >
                        {notification.body}
                      </Typo>
                    )}
                  </View>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-start",
    zIndex: 9999, // Ensure it stays on top of headers/tabs
  },
  bannerWrap: {
    paddingHorizontal: spacingX._15,
    width: "100%",
  },
  banner: {
    borderRadius: radius._15,
    borderWidth: 1,
    overflow: "hidden",
    // Premium soft-shadow architecture
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: verticalScale(74),
  },
  leftAccentIndicator: {
    width: scale(4),
    height: "100%",
  },
  innerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: spacingX._12,
    paddingRight: spacingX._15,
    paddingVertical: spacingY._12,
    gap: spacingX._12,
  },
  iconAvatar: {
    width: scale(42),
    height: scale(42),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacingY._5,
  },
  tagText: {
    letterSpacing: 0.8,
  },
  closeButton: {
    padding: scale(4),
    marginTop: -scale(4), // Aligns perfectly to the text baseline
  },
  bodyText: {
    marginTop: spacingY._5,
    lineHeight: verticalScale(16),
  },
});