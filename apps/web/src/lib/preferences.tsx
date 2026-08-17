import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type LocalePreference = "en" | "zh";

type PreferencesValue = {
  theme: ThemePreference;
  locale: LocalePreference;
  setTheme: (theme: ThemePreference) => void;
  setLocale: (locale: LocalePreference) => void;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

function storedTheme(): ThemePreference {
  const value = localStorage.getItem("starter.theme");
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function storedLocale(): LocalePreference {
  return localStorage.getItem("starter.locale") === "zh" ? "zh" : "en";
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>(storedTheme);
  const [locale, setLocale] = useState<LocalePreference>(storedLocale);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.style.colorScheme = document.documentElement.dataset.theme;
    };
    apply();
    media.addEventListener("change", apply);
    localStorage.setItem("starter.theme", theme);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    localStorage.setItem("starter.locale", locale);
  }, [locale]);

  const value = useMemo(() => ({ theme, locale, setTheme, setLocale }), [theme, locale]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used inside PreferencesProvider");
  return context;
}
