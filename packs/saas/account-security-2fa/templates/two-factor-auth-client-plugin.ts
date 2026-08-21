import { twoFactorClient } from "better-auth/client/plugins";

function safeReturnTo() {
  const candidate =
    new URLSearchParams(window.location.search).get("returnTo") || "/app";
  return candidate.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : "/app";
}

export function createTwoFactorAuthClientPlugin() {
  return twoFactorClient({
    onTwoFactorRedirect() {
      window.location.assign(
        `/two-factor?returnTo=${encodeURIComponent(safeReturnTo())}`,
      );
    },
  });
}
