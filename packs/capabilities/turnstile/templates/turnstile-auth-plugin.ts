import { captcha } from "better-auth/plugins";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";

export function createTurnstileAuthPlugin(
  input: SelectedAuthPluginInput,
  _features: { turnstile: boolean },
) {
  if (!input.turnstileSecretKey)
    throw new Error("Turnstile is selected but TURNSTILE_SECRET_KEY is missing.");
  return captcha({
    provider: "cloudflare-turnstile",
    secretKey: input.turnstileSecretKey,
    endpoints: ["/sign-up/email", "/sign-in/email", "/request-password-reset"],
  });
}
