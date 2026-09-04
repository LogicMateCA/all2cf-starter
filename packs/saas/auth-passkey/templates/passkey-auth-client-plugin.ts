import { passkeyClient } from "@better-auth/passkey/client";
export function createPasskeyAuthClientPlugin() {
  return passkeyClient();
}
