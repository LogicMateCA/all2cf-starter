import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { TamaguiProvider } from "@tamagui/core";
import { mobileTamaguiConfig } from "../tamagui.config";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <TamaguiProvider config={mobileTamaguiConfig} defaultTheme={colorScheme === "dark" ? "dark" : "light"}>
      <Stack screenOptions={{ headerShown: false }} />
    </TamaguiProvider>
  );
}
