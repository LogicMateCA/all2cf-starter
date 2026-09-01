export type GenericOAuthProviderConfig = {
  providerId: string;
  name: string;
  clientId: string;
  clientSecret?: string;
  discoveryUrl?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes?: string[];
  requireIdTokenVerification?: boolean;
  disableImplicitSignUp?: boolean;
};

const idPattern = /^[a-z][a-z0-9-]{1,62}$/u;

function optionalHttpsUrl(value: unknown, label: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string")
    throw new Error(`${label} must be a URL string.`);
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`${label} must use HTTPS.`);
  return url.toString();
}

export function parseGenericOAuthProviders(
  raw?: string,
): GenericOAuthProviderConfig[] {
  if (!raw?.trim())
    throw new Error(
      "GENERIC_OAUTH_PROVIDERS_JSON is required when Generic OAuth is selected.",
    );
  if (raw.length > 262_144)
    throw new Error("Generic OAuth configuration exceeds 256 KiB.");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 20)
    throw new Error("Generic OAuth requires 1-20 providers.");
  const seen = new Set<string>();
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object")
      throw new Error(`Generic OAuth provider ${index + 1} must be an object.`);
    const source = entry as Record<string, unknown>;
    const providerId = String(source.providerId || "").trim();
    const name = String(source.name || providerId).trim();
    const clientId = String(source.clientId || "").trim();
    if (!idPattern.test(providerId) || seen.has(providerId))
      throw new Error(
        `Generic OAuth provider ID ${providerId || index + 1} is invalid or duplicated.`,
      );
    if (!name || name.length > 80 || !clientId || clientId.length > 500)
      throw new Error(
        `Generic OAuth provider ${providerId} has invalid identity fields.`,
      );
    seen.add(providerId);
    const discoveryUrl = optionalHttpsUrl(
      source.discoveryUrl,
      `${providerId}.discoveryUrl`,
    );
    const authorizationUrl = optionalHttpsUrl(
      source.authorizationUrl,
      `${providerId}.authorizationUrl`,
    );
    const tokenUrl = optionalHttpsUrl(
      source.tokenUrl,
      `${providerId}.tokenUrl`,
    );
    const userInfoUrl = optionalHttpsUrl(
      source.userInfoUrl,
      `${providerId}.userInfoUrl`,
    );
    if (!discoveryUrl && (!authorizationUrl || !tokenUrl || !userInfoUrl))
      throw new Error(
        `${providerId} needs discoveryUrl or explicit authorization, token and user-info URLs.`,
      );
    const scopes =
      source.scopes === undefined
        ? ["openid", "profile", "email"]
        : source.scopes;
    if (
      !Array.isArray(scopes) ||
      scopes.length > 50 ||
      scopes.some(
        (scope) =>
          typeof scope !== "string" || !scope.trim() || scope.length > 128,
      )
    )
      throw new Error(`${providerId}.scopes must be non-empty strings.`);
    return {
      providerId,
      name,
      clientId,
      clientSecret:
        typeof source.clientSecret === "string" && source.clientSecret
          ? source.clientSecret
          : undefined,
      discoveryUrl,
      authorizationUrl,
      tokenUrl,
      userInfoUrl,
      scopes: scopes.map((scope) => String(scope).trim()),
      requireIdTokenVerification: source.requireIdTokenVerification !== false,
      disableImplicitSignUp: source.disableImplicitSignUp === true,
    };
  });
}
