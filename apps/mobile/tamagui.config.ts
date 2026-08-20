import { createFont, createTamagui, createTokens } from "@tamagui/core";
import { shorthands } from "@tamagui/shorthands/v4";
import { generatedMobileDesign } from "./generated/design-profile";

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
    white: generatedMobileDesign.light.onAccent,
    black: generatedMobileDesign.light.foreground,
    blue10: generatedMobileDesign.light.accent,
    green10: "#157a55",
    red10: "#c73a4a",
  },
  space: scale,
  size: scale,
  radius: { 0: 0, 1: 4, 2: generatedMobileDesign.radius.sm, 3: generatedMobileDesign.radius.md, 4: generatedMobileDesign.radius.lg, 5: 16, 6: 20, true: generatedMobileDesign.radius.md },
  zIndex: { 0: 0, 1: 100, 2: 200, 3: 300, 4: 400, true: 0 },
});

const fontMetrics = {
  size: { 1: 12, 2: 14, 3: 16, 4: 18, 5: 20, 6: 24, 7: 30, 8: 36, 9: 44, true: 16 },
  lineHeight: { 1: 16, 2: 20, 3: 24, 4: 26, 5: 28, 6: 32, 7: 38, 8: 44, 9: 52, true: 24 },
  weight: { 4: "400", 5: "500", 6: "600", 7: "700", true: "400" },
  letterSpacing: { 1: 0, 2: 0, 3: 0, 4: -0.1, 5: -0.2, 6: -0.3, 7: -0.5, 8: -0.7, 9: -1, true: 0 },
} as const;

const bodyFont = createFont({ family: generatedMobileDesign.fonts.ui, ...fontMetrics });
const headingFont = createFont({ family: generatedMobileDesign.fonts.display, ...fontMetrics });

const light = {
  background: generatedMobileDesign.light.background,
  backgroundHover: generatedMobileDesign.light.surface,
  backgroundPress: generatedMobileDesign.light.border,
  backgroundFocus: generatedMobileDesign.light.surface,
  color: generatedMobileDesign.light.foreground,
  colorHover: generatedMobileDesign.light.foreground,
  colorPress: generatedMobileDesign.light.foreground,
  colorFocus: generatedMobileDesign.light.foreground,
  borderColor: generatedMobileDesign.light.border,
  borderColorHover: generatedMobileDesign.light.muted,
  borderColorPress: generatedMobileDesign.light.muted,
  borderColorFocus: generatedMobileDesign.light.accent,
  placeholderColor: generatedMobileDesign.light.muted,
};

const dark = {
  background: generatedMobileDesign.dark.background,
  backgroundHover: generatedMobileDesign.dark.surface,
  backgroundPress: generatedMobileDesign.dark.border,
  backgroundFocus: generatedMobileDesign.dark.surface,
  color: generatedMobileDesign.dark.foreground,
  colorHover: generatedMobileDesign.dark.foreground,
  colorPress: generatedMobileDesign.dark.foreground,
  colorFocus: generatedMobileDesign.dark.foreground,
  borderColor: generatedMobileDesign.dark.border,
  borderColorHover: generatedMobileDesign.dark.muted,
  borderColorPress: generatedMobileDesign.dark.muted,
  borderColorFocus: generatedMobileDesign.dark.accent,
  placeholderColor: generatedMobileDesign.dark.muted,
};

export const mobileTamaguiConfig = createTamagui({
  tokens,
  themes: {
    light,
    dark,
    light_Button: { ...light, background: generatedMobileDesign.light.accent, backgroundHover: generatedMobileDesign.light.foreground, backgroundPress: generatedMobileDesign.light.accent, color: generatedMobileDesign.light.onAccent },
    dark_Button: { ...dark, background: generatedMobileDesign.dark.accent, backgroundHover: generatedMobileDesign.dark.foreground, backgroundPress: generatedMobileDesign.dark.accent, color: generatedMobileDesign.dark.onAccent },
  },
  fonts: { body: bodyFont, heading: headingFont },
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
