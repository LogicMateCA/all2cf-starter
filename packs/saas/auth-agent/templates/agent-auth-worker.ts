import { Hono } from "hono";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";
const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();
feature.get("/.well-known/agent-configuration", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth) => {
    const configuration = await auth.api.getAgentConfiguration();
    return c.json(configuration, 200, {
      "Cache-Control": "public, max-age=300",
    });
  }),
);
export const agentAuthFeature = feature;
