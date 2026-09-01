import { scim } from "@better-auth/scim";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";
import { parseScimConnections } from "./scim-config";
export function createScimAuthPlugin(
  input: SelectedAuthPluginInput,
  _features: Record<string, boolean>,
) {
  return scim({
    connections: parseScimConnections(input.scimConnectionsJson),
    ...(input.scimCredentialHashSecret
      ? {
          managedConnections: {
            credentialHashSecret: input.scimCredentialHashSecret,
          },
        }
      : {}),
  });
}
