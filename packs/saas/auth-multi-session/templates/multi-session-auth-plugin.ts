import { multiSession } from "better-auth/plugins";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";
export function createMultiSessionAuthPlugin(
  _input: SelectedAuthPluginInput,
  _features: Record<string, boolean>,
) {
  return multiSession({ maximumSessions: 5 });
}
