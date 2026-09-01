export type ScimConnection = {
  id: string;
  provisioningDomainId: string;
  credentials: {
    type: "bearer";
    id: string;
    token: string;
    scopes: (
      | "scim.users.read"
      | "scim.users.write"
      | "scim.groups.read"
      | "scim.groups.write"
    )[];
    expiresAt?: Date;
  }[];
};
const idPattern = /^[a-z][a-z0-9._-]{1,63}$/u;
const scopes = new Set([
  "scim.users.read",
  "scim.users.write",
  "scim.groups.read",
  "scim.groups.write",
]);
export function parseScimConnections(raw?: string): ScimConnection[] {
  if (!raw?.trim())
    throw new Error("SCIM_CONNECTIONS_JSON is required when SCIM is selected.");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 20)
    throw new Error("SCIM requires 1-20 connections.");
  const connectionIds = new Set<string>();
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object")
      throw new Error(`SCIM connection ${index + 1} must be an object.`);
    const source = entry as Record<string, unknown>;
    const id = String(source.id || "").trim();
    const provisioningDomainId = String(
      source.provisioningDomainId || id,
    ).trim();
    if (
      !idPattern.test(id) ||
      connectionIds.has(id) ||
      !idPattern.test(provisioningDomainId)
    )
      throw new Error(
        `SCIM connection ${id || index + 1} has an invalid or duplicate ID.`,
      );
    connectionIds.add(id);
    if (
      !Array.isArray(source.credentials) ||
      source.credentials.length < 1 ||
      source.credentials.length > 5
    )
      throw new Error(`${id} requires 1-5 credentials.`);
    const credentialIds = new Set<string>();
    const credentials = source.credentials.map((value) => {
      if (!value || typeof value !== "object")
        throw new Error(`${id} credential must be an object.`);
      const credential = value as Record<string, unknown>;
      const credentialId = String(credential.id || "").trim();
      const token = String(credential.token || "");
      if (
        !idPattern.test(credentialId) ||
        credentialIds.has(credentialId) ||
        token.length < 32
      )
        throw new Error(`${id} has an invalid credential.`);
      credentialIds.add(credentialId);
      const selectedScopes =
        credential.scopes === undefined ? [...scopes] : credential.scopes;
      if (
        !Array.isArray(selectedScopes) ||
        selectedScopes.some((scope) => !scopes.has(String(scope)))
      )
        throw new Error(`${id}.${credentialId} has invalid scopes.`);
      const expiresAt =
        credential.expiresAt === undefined
          ? undefined
          : new Date(String(credential.expiresAt));
      if (expiresAt && Number.isNaN(expiresAt.valueOf()))
        throw new Error(`${id}.${credentialId} has invalid expiry.`);
      return {
        type: "bearer" as const,
        id: credentialId,
        token,
        scopes: selectedScopes.map(
          String,
        ) as ScimConnection["credentials"][number]["scopes"],
        expiresAt,
      };
    });
    return { id, provisioningDomainId, credentials };
  });
}
