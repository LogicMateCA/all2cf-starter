import type { ExpoConfig } from "expo/config";

type AppVariant = "development" | "preview" | "production";

const variant = (process.env.APP_VARIANT ?? "development") as AppVariant;
const easProjectId = process.env.EXPO_PROJECT_ID;
const settings: Record<AppVariant, { name: string; bundleIdentifier: string; packageName: string; scheme: string }> = {
  development: {
    name: "Starter (Dev)",
    bundleIdentifier: "com.logicm8.starter.dev",
    packageName: "com.logicm8.starter.dev",
    scheme: "starter-dev"
  },
  preview: {
    name: "Starter (Preview)",
    bundleIdentifier: "com.logicm8.starter.preview",
    packageName: "com.logicm8.starter.preview",
    scheme: "starter-preview"
  },
  production: {
    name: "Starter",
    bundleIdentifier: "com.logicm8.starter",
    packageName: "com.logicm8.starter",
    scheme: "starter"
  }
};

const selected = settings[variant] ?? settings.development;

const config: ExpoConfig = {
  name: selected.name,
  slug: "starter-mobile",
  version: "1.0.0",
  platforms: ["ios", "android"],
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  scheme: selected.scheme,
  ios: {
    bundleIdentifier: selected.bundleIdentifier,
    supportsTablet: true
  },
  android: {
    package: selected.packageName
  },
  plugins: ["expo-router", "expo-dev-client", "expo-secure-store", "expo-updates"],
  extra: {
    appVariant: variant,
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {})
  },
  runtimeVersion: { policy: "appVersion" },
  ...(easProjectId ? { updates: { url: `https://u.expo.dev/${easProjectId}` } } : {})
};

export default config;
