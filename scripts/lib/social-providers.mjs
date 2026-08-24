export const supportedSocialProviders = ["google", "github", "apple"];

export function renderSocialProviderSelection(providers) {
  const selected = [...providers].filter((value) => supportedSocialProviders.includes(value));
  return selected.length ? selected.join(",") : "none";
}

export function selectedSocialProviders(env) {
  return String(env.AUTH_SOCIAL_PROVIDERS == null ? "google" : env.AUTH_SOCIAL_PROVIDERS)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => supportedSocialProviders.includes(value));
}

export function socialProviderMethods(env) {
  const readiness = {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    apple: Boolean(
      env.APPLE_CLIENT_ID &&
        env.APPLE_TEAM_ID &&
        env.APPLE_KEY_ID &&
        env.APPLE_PRIVATE_KEY_BASE64 &&
        env.APPLE_APP_BUNDLE_IDENTIFIER,
    ),
  };
  const labels = { google: "Google", github: "GitHub", apple: "Apple" };
  return selectedSocialProviders(env).map((key) => ({
    key,
    kind: "social",
    label: labels[key],
    enabled: readiness[key],
  }));
}
