import { genericOAuth } from "better-auth/plugins";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";
import { parseGenericOAuthProviders } from "./generic-oauth-config";

export function createGenericOAuthAuthPlugin(
  input: SelectedAuthPluginInput,
  _features: Record<string, boolean>,
) {
  return genericOAuth({
    config: parseGenericOAuthProviders(input.genericOAuthProvidersJson),
  });
}
