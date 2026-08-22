import { Hono } from "hono";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";

type VectorizeBindings = AuthRuntimeEnv & {
  VECTOR_INDEX: VectorizeIndex;
  VECTORIZE_INDEX_NAME: string;
  VECTORIZE_DIMENSIONS: string;
  VECTORIZE_METRIC: string;
};

function testVector(dimensions: number) {
  const vector = Array.from({ length: dimensions }, () => 0);
  vector[0] = 1;
  return vector;
}

async function waitForMatch(index: VectorizeIndex, id: string, vector: number[]) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = await index.query(vector, { topK: 1, returnMetadata: "all" });
    const match = result.matches.find((entry) => entry.id === id);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();

feature.post("/api/admin/vectorize/test", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const roles = String(session?.user?.role || "").split(",").map((role) => role.trim());
    if (!session?.user)
      return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
    if (!roles.includes("admin"))
      return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
    const env = c.env as VectorizeBindings;
    const dimensions = Number(env.VECTORIZE_DIMENSIONS);
    if (!Number.isInteger(dimensions) || dimensions < 32 || dimensions > 1536)
      return c.json({ error: { code: "INVALID_CONFIGURATION", message: "Vectorize dimensions are invalid." } }, 500);
    const id = `starter-test-${crypto.randomUUID()}`;
    const vector = testVector(dimensions);
    const upsert = await env.VECTOR_INDEX.upsert([{ id, values: vector, metadata: { purpose: "starter-admin-test" } }]);
    try {
      const match = await waitForMatch(env.VECTOR_INDEX, id, vector);
      if (!match)
        return c.json({ error: { code: "VECTOR_NOT_VISIBLE", message: "Vectorize mutation did not become queryable in time." } }, 503);
      const mutation = upsert as VectorizeVectorMutation & { mutationId?: string };
      return c.json({ data: { index: env.VECTORIZE_INDEX_NAME, dimensions, metric: env.VECTORIZE_METRIC, mutationId: mutation.mutationId || null, processed: mutation.count ?? mutation.ids?.length ?? null, match: { id: match.id, score: match.score } } }, 200, { "Cache-Control": "no-store" });
    } finally {
      await env.VECTOR_INDEX.deleteByIds([id]).catch(() => undefined);
    }
  }),
);

export const vectorizeFeature = feature;
