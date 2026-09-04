import { Hono } from "hono";
import type { AuthRuntimeEnv } from "../auth-runtime";
import { parseGenericOAuthProviders } from "./generic-oauth-config";

const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();
feature.get("/api/generic-oauth/providers", (c) => {
  try {
    const providers = parseGenericOAuthProviders(
      c.env.GENERIC_OAUTH_PROVIDERS_JSON,
    ).map(({ providerId, name }) => ({ providerId, name }));
    return c.json({ providers }, 200, { "Cache-Control": "no-store" });
  } catch {
    return c.json({ providers: [] }, 503, { "Cache-Control": "no-store" });
  }
});
export const genericOAuthFeature = feature;
