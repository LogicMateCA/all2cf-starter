import type { ExpoConfig } from "expo/config";
import starter from "../../starter.config.json";

type AppVariant = "development" | "preview" | "production";

const variant = (process.env.APP_VARIANT ?? "development") as AppVariant;
const easProjectId = process.env.EXPO_PROJECT_ID;
const applicationNamespace = `${starter.cloudflare.zoneName.split(".").reverse().join(".")}.${starter.project.slug.replaceAll("-", "")}`;
const settings: Record<AppVariant, { name: string; bundleIdentifier: string; packageName: string; scheme: string }> = {
  development: {
    name: `${starter.project.name} (Dev)`,
    bundleIdentifier: `${applicationNamespace}.dev`,
    packageName: `${applicationNamespace}.dev`,
    scheme: `${starter.project.slug}-dev`
  },
  preview: {
    name: `${starter.project.name} (Preview)`,
    bundleIdentifier: `${applicationNamespace}.preview`,
    packageName: `${applicationNamespace}.preview`,
    scheme: `${starter.project.slug}-preview`
  },
  production: {
    name: starter.project.name,
    bundleIdentifier: applicationNamespace,
    packageName: applicationNamespace,
    scheme: starter.project.slug
  }
};

const selected = settings[variant] ?? settings.development;

const config: ExpoConfig = {
  name: selected.name,
  slug: `${starter.project.slug}-mobile`,
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
    apiUrls: {
      development: `https://${starter.development.domain}`,
      production: `https://${starter.production.domain}`
    },
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {})
  },
  runtimeVersion: { policy: "appVersion" },
  ...(easProjectId ? { updates: { url: `https://u.expo.dev/${easProjectId}` } } : {})
};

export default config;
