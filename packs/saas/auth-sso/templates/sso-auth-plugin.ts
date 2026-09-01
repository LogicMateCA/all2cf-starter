import { sso } from "@better-auth/sso";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";
import { parseSsoProviders } from "./sso-config";
export function createSsoAuthPlugin(
  input: SelectedAuthPluginInput,
  _features: Record<string, boolean>,
) {
  return sso({
    defaultSSO: parseSsoProviders(input.ssoProvidersJson),
    organizationProvisioning: { disabled: true },
    schema: {
      ssoProvider: {
        modelName: "app_sso_provider",
        fields: {
          issuer: "issuer",
          oidcConfig: "oidc_config",
          samlConfig: "saml_config",
          userId: "user_id",
          providerId: "provider_id",
          organizationId: "organization_id",
          domain: "domain",
        },
      },
    },
  });
}
