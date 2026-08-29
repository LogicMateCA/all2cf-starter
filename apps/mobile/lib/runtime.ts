import Constants from "expo-constants";
import * as Updates from "expo-updates";

type StarterExtra = {
  appVariant?: "development" | "preview" | "production";
  apiUrls?: { development?: string; production?: string };
};

const extra = Constants.expoConfig?.extra as StarterExtra | undefined;
const configuredVariant = extra?.appVariant ?? "development";

export const appVariant = Updates.channel === "production" ? "production" : configuredVariant;
export const apiUrl = appVariant === "production"
  ? extra?.apiUrls?.production
  : Updates.channel
    ? extra?.apiUrls?.development
    : process.env.EXPO_PUBLIC_API_URL || extra?.apiUrls?.development;

const configuredScheme = Constants.expoConfig?.scheme;
export const appScheme = Array.isArray(configuredScheme) ? configuredScheme[0] : configuredScheme || "starter-dev";

if (!apiUrl) throw new Error("Mobile API URL is not configured");
