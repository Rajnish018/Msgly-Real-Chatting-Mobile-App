import { AppLanguage } from "@/types";

export type LanguageOption = {
  code: AppLanguage;
  labelKey: string;
  nativeLabel: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", labelKey: "english", nativeLabel: "English" },
  { code: "hi", labelKey: "hindi", nativeLabel: "हिंदी" },
  { code: "es", labelKey: "spanish", nativeLabel: "Español" },
];

export const isSupportedLanguage = (value: string | null): value is AppLanguage =>
  LANGUAGE_OPTIONS.some((option) => option.code === value);

export const getLanguageOption = (language: AppLanguage) =>
  LANGUAGE_OPTIONS.find((option) => option.code === language) || LANGUAGE_OPTIONS[0];
