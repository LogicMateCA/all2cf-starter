import { apiKeyClient } from "@better-auth/api-key/client";

export function createApiKeyAuthClientPlugin() {
  return apiKeyClient();
}
