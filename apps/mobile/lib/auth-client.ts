import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { apiUrl, appScheme } from "./runtime";

const webStorage = {
  getItem(key: string) { return typeof localStorage === "undefined" ? null : localStorage.getItem(key); },
  setItem(key: string, value: string) { if (typeof localStorage !== "undefined") localStorage.setItem(key, value); },
};

export const authClient = createAuthClient({
  baseURL: apiUrl,
  basePath: "/api/auth",
  plugins: [expoClient({
    scheme: appScheme,
    storagePrefix: "starter",
    cookiePrefix: "cloudflare-ai-starter",
    storage: Platform.OS === "web" ? webStorage : SecureStore,
  })],
});

export function authenticatedHeaders() {
  const cookie = authClient.getCookie();
  return cookie ? { Cookie: cookie } : {};
}
