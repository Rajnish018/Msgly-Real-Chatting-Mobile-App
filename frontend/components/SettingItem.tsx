import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform,
} from "react-native";
import * as Icons from "phosphor-react-native";
import Typo from "@/components/Typo";
import { useTheme } from "@/context/themeContext";
import { scale } from "@/utils/styling";

interface SettingItemProps {
  icon?: React.ComponentType<any>;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  color?: string;
  showBorder?: boolean;
}

const SettingItem = ({
  icon: Icon,
  title,
  subtitle,
  value,
  onPress,
  isSwitch = false,
  switchValue,
  onSwitchChange,
  color,
  showBorder = true,
}: SettingItemProps) => {
  const { colors: themeColors } = useTheme();
  const SafeIcon = Icon || Icons.CircleIcon;

  // Fallback to theme text color if custom color isn't provided
  const itemColor = color || themeColors.black;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={isSwitch || !onPress}
      style={[
        styles.item,
        { borderBottomColor: themeColors.neutral200 },
        !showBorder && { borderBottomWidth: 0 },
      ]}
    >
      {/* Left side: Icon & Text Info */}
      <View style={styles.itemLeft}>
        <View style={styles.iconContainer}>
          <SafeIcon size={scale(22)} color={itemColor} weight="regular" />
        </View>
        <View style={styles.textContainer}>
          <Typo size={16} fontWeight="500" color={itemColor}>
            {title}
          </Typo>
          {subtitle && (
            <Typo size={13} color={themeColors.neutral500} style={styles.subtitle}>
              {subtitle}
            </Typo>
          )}
        </View>
      </View>

      {/* Right side: Switch OR Text Value */}
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: themeColors.neutral200, true: themeColors.primary }}
          thumbColor={Platform.OS === "ios" ? undefined : themeColors.white}
        />
      ) : (
        <View style={styles.itemRight}>
          {value && (
            <Typo color={themeColors.neutral500} size={14}>
              {value}
            </Typo>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

export default SettingItem;

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: scale(14),
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    padding: scale(4),
  },
  textContainer: {
    flexDirection: "column",
    justifyContent: "center",
    marginLeft: scale(12),
    flex: 1,
  },
  subtitle: {
    marginTop: scale(2),
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});
