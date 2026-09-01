import { passkey } from "@better-auth/passkey";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";

export function createPasskeyAuthPlugin(
  input: SelectedAuthPluginInput,
  _features: Record<string, boolean>,
) {
  const origin = new URL(input.baseURL).origin;
  return passkey({
    rpID: new URL(origin).hostname,
    rpName: input.appName,
    origin,
    schema: {
      passkey: {
        modelName: "app_passkey",
        fields: {
          publicKey: "public_key",
          userId: "user_id",
          credentialID: "credential_id",
          deviceType: "device_type",
          backedUp: "backed_up",
          createdAt: "created_at",
        },
      },
    },
  });
}
