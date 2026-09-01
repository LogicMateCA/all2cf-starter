type SsoProvider = {
  domain: string;
  providerId: string;
  oidcConfig?: {
    issuer: string;
    pkce: true;
    clientId: string;
    clientSecret?: string;
    discoveryEndpoint: string;
    scopes: string[];
    tokenEndpointAuthentication?: "client_secret_post" | "client_secret_basic";
  };
  samlConfig?: {
    issuer: string;
    entryPoint: string;
    cert: string | string[];
    idpMetadata: { entityID: string; cert: string | string[] };
    wantAssertionsSigned: true;
    authnRequestsSigned: false;
  };
};
const idPattern = /^[a-z][a-z0-9-]{1,62}$/u;
const domainPattern = /^(?=.{1,253}$)(?!-)(?:[a-z0-9-]+\.)+[a-z]{2,63}$/u;
function httpsUrl(value: unknown, label: string) {
  const url = new URL(String(value || ""));
  if (url.protocol !== "https:") throw new Error(`${label} must use HTTPS.`);
  return url.toString();
}
export function parseSsoProviders(raw?: string): SsoProvider[] {
  if (!raw?.trim())
    throw new Error("SSO_PROVIDERS_JSON is required when SSO is selected.");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 20)
    throw new Error("SSO requires 1-20 providers.");
  const ids = new Set<string>();
  const domains = new Set<string>();
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object")
      throw new Error(`SSO provider ${index + 1} must be an object.`);
    const source = entry as Record<string, unknown>;
    const providerId = String(source.providerId || "").trim();
    const domain = String(source.domain || "")
      .trim()
      .toLowerCase();
    if (
      !idPattern.test(providerId) ||
      ids.has(providerId) ||
      !domainPattern.test(domain) ||
      domains.has(domain)
    )
      throw new Error(
        `SSO provider ${providerId || index + 1} has an invalid or duplicated ID/domain.`,
      );
    ids.add(providerId);
    domains.add(domain);
    const oidc = source.oidcConfig as Record<string, unknown> | undefined;
    const saml = source.samlConfig as Record<string, unknown> | undefined;
    if (Boolean(oidc) === Boolean(saml))
      throw new Error(
        `${providerId} must configure exactly one of oidcConfig or samlConfig.`,
      );
    if (oidc)
      return {
        domain,
        providerId,
        oidcConfig: {
          issuer: httpsUrl(oidc.issuer, `${providerId}.issuer`),
          pkce: true,
          clientId: String(oidc.clientId || ""),
          clientSecret:
            typeof oidc.clientSecret === "string"
              ? oidc.clientSecret
              : undefined,
          discoveryEndpoint: httpsUrl(
            oidc.discoveryEndpoint,
            `${providerId}.discoveryEndpoint`,
          ),
          scopes: Array.isArray(oidc.scopes)
            ? oidc.scopes.map(String)
            : ["openid", "profile", "email"],
          tokenEndpointAuthentication:
            oidc.tokenEndpointAuthentication === "client_secret_post"
              ? "client_secret_post"
              : "client_secret_basic",
        },
      };
    const cert = saml!.cert;
    if (
      !(
        typeof cert === "string" ||
        (Array.isArray(cert) && cert.every((item) => typeof item === "string"))
      ) ||
      !cert ||
      !String(Array.isArray(cert) ? cert[0] : cert).includes(
        "BEGIN CERTIFICATE",
      )
    )
      throw new Error(
        `${providerId}.cert must contain PEM certificate material.`,
      );
    return {
      domain,
      providerId,
      samlConfig: {
        issuer: String(saml!.issuer || ""),
        entryPoint: httpsUrl(saml!.entryPoint, `${providerId}.entryPoint`),
        cert,
        idpMetadata: { entityID: String(saml!.entityID || ""), cert },
        wantAssertionsSigned: true,
        authnRequestsSigned: false,
      },
    };
  });
}
