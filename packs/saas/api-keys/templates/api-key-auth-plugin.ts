import { apiKey } from "@better-auth/api-key";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";

type SelectedFeatures = {
  organizations: boolean;
  stripeBilling: boolean;
  apiKeys: boolean;
};

export function createApiKeyAuthPlugin(
  _input: SelectedAuthPluginInput,
  _features: SelectedFeatures,
) {
  return apiKey({
    references: "user",
    storage: "database",
    disableKeyHashing: false,
    enableSessionForAPIKeys: false,
    defaultPrefix: "app_",
    defaultKeyLength: 64,
    requireName: true,
    minimumNameLength: 3,
    maximumNameLength: 48,
    startingCharactersConfig: {
      shouldStore: true,
      charactersLength: 12,
    },
    rateLimit: {
      enabled: true,
      timeWindow: 60_000,
      maxRequests: 60,
    },
    permissions: {
      defaultPermissions: {
        product: ["read"],
      },
    },
    schema: {
      apikey: {
        modelName: "app_api_key",
        fields: {
          configId: "config_id",
          referenceId: "reference_id",
          refillInterval: "refill_interval",
          refillAmount: "refill_amount",
          lastRefillAt: "last_refill_at",
          rateLimitEnabled: "rate_limit_enabled",
          rateLimitTimeWindow: "rate_limit_time_window",
          rateLimitMax: "rate_limit_max",
          requestCount: "request_count",
          lastRequest: "last_request",
          expiresAt: "expires_at",
          createdAt: "created_at",
          updatedAt: "updated_at",
        },
      },
    },
  });
}
