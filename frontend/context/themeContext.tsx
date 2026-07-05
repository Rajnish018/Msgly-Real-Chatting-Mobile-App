import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { darkColors, lightColors } from "@/constants/theme";
import { ThemeContextProps, ThemePreference } from "@/types";

const THEME_PREFERENCE_KEY = "themePreference";

const ThemeContext = createContext<ThemeContextProps>({
  colors: lightColors,
  colorScheme: "light",
  isDark: false,
  themePreference: "system",
  setThemePreference: async () => {},
  toggleDarkMode: async () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    const loadThemePreference = async () => {
      const storedPreference = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
      if (storedPreference === "light" || storedPreference === "dark" || storedPreference === "system") {
        setThemePreferenceState(storedPreference);
      }
    };

    loadThemePreference();
  }, []);

  const resolvedScheme =
    themePreference === "system" ? (systemScheme === "dark" ? "dark" : "light") : themePreference;

  const contextValue = useMemo<ThemeContextProps>(() => {
    const isDark = resolvedScheme === "dark";

    const setThemePreference = async (preference: ThemePreference) => {
      setThemePreferenceState(preference);
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
    };

    const toggleDarkMode = async (enabled: boolean) => {
      const preference: ThemePreference = enabled ? "dark" : "light";
      setThemePreferenceState(preference);
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
    };

    return {
      colors: isDark ? darkColors : lightColors,
      colorScheme: resolvedScheme,
      isDark,
      themePreference,
      setThemePreference,
      toggleDarkMode,
    };
  }, [resolvedScheme, themePreference]);

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
