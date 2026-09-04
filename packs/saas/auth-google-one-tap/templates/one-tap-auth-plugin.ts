import { oneTap } from "better-auth/plugins";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";
export function createOneTapAuthPlugin(
  input: SelectedAuthPluginInput,
  _features: Record<string, boolean>,
) {
  if (!input.googleOneTapClientId)
    throw new Error(
      "Google One Tap requires the selected Google OAuth client ID.",
    );
  return oneTap({ clientId: input.googleOneTapClientId, disableSignup: false });
}
