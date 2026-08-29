export type SocialProviderId = "google" | "github" | "apple";
export type SocialProviderEnvironment = Record<string, unknown> & { AUTH_SOCIAL_PROVIDERS?: string };
export function selectedSocialProviders(env: SocialProviderEnvironment): SocialProviderId[];
export function socialProviderMethods(env: SocialProviderEnvironment): Array<{ key: SocialProviderId; kind: "social"; label: string; enabled: boolean }>;
