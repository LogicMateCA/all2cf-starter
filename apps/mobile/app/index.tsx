import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@tamagui/button";
import { Text } from "@tamagui/core";
import { Circle } from "@tamagui/shapes";
import { Spinner } from "@tamagui/spinner";
import { XStack, YStack } from "@tamagui/stacks";
import { H1, Paragraph } from "@tamagui/text";

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
    <YStack flex={1} justify="center" gap="$3" p="$6" bg="$background">
      <H1 mb="$4">Starter</H1>
      <Text color="$color10" fontSize="$2" textTransform="uppercase">Environment</Text>
      <Paragraph mb="$2">{appVariant}</Paragraph>
      <Text color="$color10" fontSize="$2" textTransform="uppercase">API</Text>
      <Paragraph mb="$2">{apiUrl}</Paragraph>
      <XStack items="center" gap="$2" mt="$3">
        {status === "checking" ? <Spinner /> : <Circle size={12} background={status === "healthy" ? "$green10" : "$red10"} />}
        <Paragraph accessibilityRole="text">API health: {status}</Paragraph>
      </XStack>
      <Button mt="$4" onPress={() => void checkHealth()} accessibilityLabel="Check API health again">
        Check again
      </Button>
    </YStack>
  );
}
