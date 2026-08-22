import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { authenticatedHeaders } from "./auth-client";
import { apiUrl } from "./runtime";

export async function registerExpoPushDevice() {
  if (Platform.OS !== "ios" && Platform.OS !== "android")
    return { status: "unsupported" as const };
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("default", {
      name: "General",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  let permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted)
    permissions = await Notifications.requestPermissionsAsync();
  const allowed = permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!allowed) return { status: "denied" as const };
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error("Expo project ID is required for push notifications.");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const cookieHeaders = await authenticatedHeaders();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if ("Cookie" in cookieHeaders && cookieHeaders.Cookie) headers.Cookie = cookieHeaders.Cookie;
  const response = await fetch(`${apiUrl}/api/push/devices`, {
    method: "POST",
    headers,
    body: JSON.stringify({ token, projectId, platform: Platform.OS }),
  });
  const payload = await response.json() as { data?: { id: string }; error?: { message?: string } };
  if (!response.ok || !payload.data)
    throw new Error(payload.error?.message || "Push device registration failed.");
  return { status: "registered" as const, deviceId: payload.data.id, token };
}

export async function unregisterExpoPushDevice(deviceId: string) {
  const cookieHeaders = await authenticatedHeaders();
  const headers: Record<string, string> = {};
  if ("Cookie" in cookieHeaders && cookieHeaders.Cookie) headers.Cookie = cookieHeaders.Cookie;
  const response = await fetch(`${apiUrl}/api/push/devices/${encodeURIComponent(deviceId)}`, {
    method: "DELETE",
    headers,
  });
  if (!response.ok) throw new Error("Push device removal failed.");
}
