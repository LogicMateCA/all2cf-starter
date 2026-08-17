import { createFont, createTamagui, createTokens } from "@tamagui/core";
import { shorthands } from "@tamagui/shorthands/v4";

const scale = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 40,
  10: 48,
  true: 16,
} as const;

const tokens = createTokens({
  color: {
    white: "#ffffff",
    black: "#101828",
    blue10: "#2858d9",
    green10: "#157a55",
    red10: "#c73a4a",
  },
  space: scale,
  size: scale,
  radius: { 0: 0, 1: 4, 2: 7, 3: 9, 4: 12, 5: 16, 6: 20, true: 9 },
  zIndex: { 0: 0, 1: 100, 2: 200, 3: 300, 4: 400, true: 0 },
});

const systemFont = createFont({
  family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  size: { 1: 12, 2: 14, 3: 16, 4: 18, 5: 20, 6: 24, 7: 30, 8: 36, 9: 44, true: 16 },
  lineHeight: { 1: 16, 2: 20, 3: 24, 4: 26, 5: 28, 6: 32, 7: 38, 8: 44, 9: 52, true: 24 },
  weight: { 4: "400", 5: "500", 6: "600", 7: "700", true: "400" },
  letterSpacing: { 1: 0, 2: 0, 3: 0, 4: -0.1, 5: -0.2, 6: -0.3, 7: -0.5, 8: -0.7, 9: -1, true: 0 },
});

const light = {
  background: "#f5f7fa",
  backgroundHover: "#edf1f6",
  backgroundPress: "#e4eaf2",
  backgroundFocus: "#edf1f6",
  color: "#18212f",
  colorHover: "#101828",
  colorPress: "#101828",
  colorFocus: "#101828",
  borderColor: "#d9e0e9",
  borderColorHover: "#b7c2d0",
  borderColorPress: "#98a6b8",
  borderColorFocus: "#2858d9",
  placeholderColor: "#7a8799",
};

const dark = {
  background: "#09101b",
  backgroundHover: "#121d2c",
  backgroundPress: "#1a283a",
  backgroundFocus: "#121d2c",
  color: "#e7ebf2",
  colorHover: "#ffffff",
  colorPress: "#ffffff",
  colorFocus: "#ffffff",
  borderColor: "#263448",
  borderColorHover: "#3a4a61",
  borderColorPress: "#50627b",
  borderColorFocus: "#7da2ff",
  placeholderColor: "#8f9db0",
};

export const mobileTamaguiConfig = createTamagui({
  tokens,
  themes: {
    light,
    dark,
    light_Button: { ...light, background: "#172033", backgroundHover: "#2858d9", backgroundPress: "#2048b1", color: "#ffffff" },
    dark_Button: { ...dark, background: "#f7f9fc", backgroundHover: "#dce6ff", backgroundPress: "#c9d8ff", color: "#111827" },
  },
  fonts: { body: systemFont, heading: systemFont },
  media: {
    xs: { maxWidth: 390 },
    sm: { maxWidth: 480 },
    short: { maxHeight: 820 },
    touch: { pointer: "coarse" },
  },
  shorthands,
  settings: {
    defaultFont: "body",
    fastSchemeChange: true,
    shouldAddPrefersColorThemes: true,
    onlyAllowShorthands: true,
    styleCompat: "web",
  },
});

export type MobileTamaguiConfig = typeof mobileTamaguiConfig;

declare module "@tamagui/core" {
  interface TamaguiCustomConfig extends MobileTamaguiConfig {}
}
