import type { Lang } from "@/lib/wiki-types";

/** The theme choice: System (the default, follows the device), Dark, Light. Thirteen languages; the 11 beyond en and ja are unreviewed. */
export interface ThemeText {
  label: string;
  system: string;
  dark: string;
  light: string;
}

export const THEME: Record<Lang, ThemeText> = {
  ja: { label: "外観", system: "システム", dark: "ダーク", light: "ライト" },
  en: { label: "Appearance", system: "System", dark: "Dark", light: "Light" },
  es: { label: "Apariencia", system: "Sistema", dark: "Oscuro", light: "Claro" },
  fr: { label: "Apparence", system: "Système", dark: "Sombre", light: "Clair" },
  zh: { label: "外观", system: "跟随系统", dark: "深色", light: "浅色" },
  ko: { label: "화면 모드", system: "시스템", dark: "다크", light: "라이트" },
  "pt-br": { label: "Aparência", system: "Sistema", dark: "Escuro", light: "Claro" },
  it: { label: "Aspetto", system: "Sistema", dark: "Scuro", light: "Chiaro" },
  ar: { label: "المظهر", system: "النظام", dark: "داكن", light: "فاتح" },
  ru: { label: "Оформление", system: "Системная", dark: "Тёмная", light: "Светлая" },
  id: { label: "Tampilan", system: "Sistem", dark: "Gelap", light: "Terang" },
  de: { label: "Darstellung", system: "System", dark: "Dunkel", light: "Hell" },
  tr: { label: "Görünüm", system: "Sistem", dark: "Koyu", light: "Açık" },
};
