import { Hono } from "hono";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";
import { parseScimConnections } from "./scim-config";
const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();
feature.get("/api/admin/scim/connections", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const roles = String(session?.user?.role || "")
      .split(",")
      .map((role) => role.trim());
    if (!session?.user)
      return c.json(
        {
          error: { code: "UNAUTHORIZED", message: "Authentication required." },
        },
        401,
      );
    if (!roles.includes("admin"))
      return c.json(
        { error: { code: "FORBIDDEN", message: "Admin role required." } },
        403,
      );
    const connections = parseScimConnections(c.env.SCIM_CONNECTIONS_JSON).map(
      ({ id, provisioningDomainId, credentials }) => ({
        id,
        provisioningDomainId,
        credentials: credentials.map(
          ({ id: credentialId, scopes, expiresAt }) => ({
            id: credentialId,
            scopes,
            expiresAt: expiresAt?.toISOString() || null,
          }),
        ),
      }),
    );
    return c.json(
      {
        connections,
        baseUrl: `${c.env.AUTH_CANONICAL_ORIGIN}/api/auth/scim/v2`,
      },
      200,
      { "Cache-Control": "no-store" },
    );
  }),
);
export const scimFeature = feature;
