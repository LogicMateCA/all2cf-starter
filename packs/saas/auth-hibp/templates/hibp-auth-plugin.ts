import { haveIBeenPwned } from "better-auth/plugins";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";

export function createHibpAuthPlugin(
  _input: SelectedAuthPluginInput,
  _features: Record<string, boolean>,
) {
  return haveIBeenPwned({
    customPasswordCompromisedMessage:
      "This password appears in a known breach. Choose a different password.",
  });
}
