import { Hono } from "hono";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";

type WorkersAiBindings = AuthRuntimeEnv & {
  AI: Ai;
  AI_MODEL: string;
  AI_GATEWAY_ID: string;
};

type AiTextResult = { response?: string } | string;

export async function runWorkersAi(
  env: WorkersAiBindings,
  prompt: string,
  metadata: Record<string, string> = {},
) {
  const normalized = prompt.trim();
  if (!normalized || normalized.length > 8_000)
    throw new RangeError("Workers AI prompt must contain 1-8000 characters.");
  const gatewayId = env.AI_GATEWAY_ID.trim();
  const result = await env.AI.run(
    env.AI_MODEL,
    {
      messages: [{ role: "user", content: normalized }],
      max_tokens: 256,
    },
    gatewayId
      ? {
          gateway: {
            id: gatewayId,
            collectLog: true,
            metadata,
          },
        }
      : undefined,
  ) as AiTextResult;
  const text = typeof result === "string" ? result : String(result.response || "");
  return {
    text,
    model: env.AI_MODEL,
    gatewayId: gatewayId || null,
    gatewayLogId: env.AI.aiGatewayLogId || null,
  };
}

const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();

feature.post("/api/admin/ai/test", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const roles = String(session?.user?.role || "").split(",").map((role) => role.trim());
    if (!session?.user)
      return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    if (!roles.includes("admin"))
      return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
    const result = await runWorkersAi(
      c.env as WorkersAiBindings,
      "Reply with exactly STARTER_AI_OK.",
      { purpose: "starter-admin-health", userId: session.user.id },
    );
    return c.json({ data: result }, 200, { "Cache-Control": "no-store" });
  }),
);

export const workersAiFeature = feature;
