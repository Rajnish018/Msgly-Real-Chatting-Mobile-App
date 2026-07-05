import { colors, radius } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { ButtonProps } from "@/types";
import { verticalScale } from "@/utils/styling";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Loading from "./Loading";

const Button = ({ style, onPress, children, loading = false }: ButtonProps) => {
  const { colors: themeColors } = useTheme();
  if (loading) {
    return (
      <View style={[styles.button, { backgroundColor: "transparent" }]}>
        <Loading />
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, { backgroundColor: themeColors.primary }, style]}>
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.full,
    borderCurve: "continuous",
    justifyContent: "center",
    alignItems: "center",
    height: verticalScale(56),
  },
});

export default Button;
