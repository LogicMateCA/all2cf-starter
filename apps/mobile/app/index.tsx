import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

type HealthState = "idle" | "checking" | "healthy" | "unavailable";

const extra = Constants.expoConfig?.extra as { appVariant?: string; apiUrls?: { development?: string; production?: string } } | undefined;
const configuredVariant = extra?.appVariant ?? "development";
const appVariant = Updates.channel === "production" ? "production" : configuredVariant;
const localApiUrl = process.env.EXPO_PUBLIC_API_URL;
const developmentApiUrl = extra?.apiUrls?.development;
const productionApiUrl = extra?.apiUrls?.production;
const apiUrl = appVariant === "production" ? productionApiUrl : Updates.channel ? developmentApiUrl : localApiUrl || developmentApiUrl;

export default function HomeScreen() {
  const [status, setStatus] = useState<HealthState>("idle");

  const checkHealth = useCallback(async () => {
    setStatus("checking");
    try {
      const response = await fetch(`${apiUrl}/api/health`);
      setStatus(response.ok ? "healthy" : "unavailable");
    } catch {
      setStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Starter</Text>
      <Text style={styles.label}>Environment</Text>
      <Text style={styles.value}>{appVariant}</Text>
      <Text style={styles.label}>API</Text>
      <Text style={styles.value}>{apiUrl}</Text>
      <View style={styles.statusRow}>
        {status === "checking" ? <ActivityIndicator /> : <View style={[styles.dot, status === "healthy" ? styles.good : styles.bad]} />}
        <Text accessibilityRole="text">API health: {status}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => void checkHealth()} style={styles.button}>
        <Text style={styles.buttonText}>Check again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 10 },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 18 },
  label: { color: "#667085", fontSize: 13, textTransform: "uppercase" },
  value: { fontSize: 17, marginBottom: 8 },
  statusRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 16 },
  dot: { borderRadius: 6, height: 12, width: 12 },
  good: { backgroundColor: "#16a34a" },
  bad: { backgroundColor: "#dc2626" },
  button: { alignItems: "center", backgroundColor: "#111827", borderRadius: 8, marginTop: 18, padding: 14 },
  buttonText: { color: "#fff", fontWeight: "600" }
});
