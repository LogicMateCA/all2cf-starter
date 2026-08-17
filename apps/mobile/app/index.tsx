import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@tamagui/button";
import { Text } from "@tamagui/core";
import { Circle } from "@tamagui/shapes";
import { Spinner } from "@tamagui/spinner";
import { XStack, YStack } from "@tamagui/stacks";
import { H1, Paragraph } from "@tamagui/text";
import { authClient } from "../lib/auth-client";
import { apiUrl, appVariant } from "../lib/runtime";

type HealthState = "idle" | "checking" | "healthy" | "unavailable";

export default function HomeScreen() {
  const [status, setStatus] = useState<HealthState>("idle");
  const { data: session, isPending } = authClient.useSession();

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
      {isPending ? <Spinner /> : session?.user ? <YStack gap="$2" mb="$4"><Paragraph>Welcome, {session.user.name || session.user.email}</Paragraph><Button chromeless borderWidth={1} borderColor="$borderColor" onPress={() => void authClient.signOut()}>Sign out</Button></YStack> : <Button mb="$4" onPress={() => router.push("/sign-in")}>Sign in</Button>}
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
