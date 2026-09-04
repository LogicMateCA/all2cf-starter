import { Hono } from "hono";
import { requireMcpAuth } from "@better-auth/mcp";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";
const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();
feature.get("/.well-known/oauth-protected-resource", (c) =>
  c.json(
    {
      resource: `${new URL(c.env.AUTH_CANONICAL_ORIGIN).origin}/mcp`,
      authorization_servers: [new URL(c.env.AUTH_CANONICAL_ORIGIN).origin],
      scopes_supported: ["mcp:tools"],
      bearer_methods_supported: ["header"],
    },
    200,
    { "Cache-Control": "public, max-age=300" },
  ),
);
feature.post("/mcp", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth) =>
    requireMcpAuth(
      auth,
      async (request, claims) => {
        let payload: {
          jsonrpc?: string;
          id?: unknown;
          method?: string;
          params?: { name?: string };
        };
        try {
          payload = await request.json();
        } catch {
          return Response.json(
            {
              jsonrpc: "2.0",
              id: null,
              error: { code: -32700, message: "Parse error" },
            },
            { status: 400 },
          );
        }
        const id = payload.id ?? null;
        if (payload.method === "initialize")
          return Response.json({
            jsonrpc: "2.0",
            id,
            result: {
              protocolVersion: "2025-06-18",
              capabilities: { tools: {} },
              serverInfo: { name: "starter-identity", version: "1.0.0" },
            },
          });
        if (payload.method === "notifications/initialized")
          return new Response(null, { status: 202 });
        if (payload.method === "tools/list")
          return Response.json({
            jsonrpc: "2.0",
            id,
            result: {
              tools: [
                {
                  name: "get_current_identity",
                  description:
                    "Return the identity authorized for this MCP connection.",
                  inputSchema: { type: "object", additionalProperties: false },
                },
              ],
            },
          });
        if (
          payload.method === "tools/call" &&
          payload.params?.name === "get_current_identity"
        )
          return Response.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    subject: claims.sub || null,
                    issuer: claims.iss || null,
                    audience: claims.aud || null,
                  }),
                },
              ],
            },
          });
        return Response.json(
          {
            jsonrpc: "2.0",
            id,
            error: { code: -32601, message: "Method not found" },
          },
          { status: 404 },
        );
      },
      {
        resource: `${new URL(c.env.AUTH_CANONICAL_ORIGIN).origin}/mcp`,
        requiredScopes: ["mcp:tools"],
      },
    )(c.req.raw),
  ),
);
export const mcpFeature = feature;
