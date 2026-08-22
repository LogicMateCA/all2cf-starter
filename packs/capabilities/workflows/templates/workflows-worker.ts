import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { Hono } from "hono";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";

type StarterWorkflowPayload = { requestedBy: string; correlationId: string };
type WorkflowsEnv = AuthRuntimeEnv & { STARTER_WORKFLOW: Workflow<StarterWorkflowPayload>; WORKFLOW_NAME: string };

export class StarterWorkflow extends WorkflowEntrypoint<AuthRuntimeEnv, StarterWorkflowPayload> {
  override async run(event: WorkflowEvent<StarterWorkflowPayload>, step: WorkflowStep) {
    const validated = await step.do("validate starter workflow payload", async () => {
      if (!event.payload.requestedBy || !event.payload.correlationId) throw new Error("Workflow payload is incomplete.");
      return { requestedBy: event.payload.requestedBy, correlationId: event.payload.correlationId };
    });
    return step.do("complete starter workflow", async () => ({ ...validated, status: "complete", completedAt: new Date().toISOString() }));
  }
}

const feature = new Hono<{ Bindings: AuthRuntimeEnv }>();
feature.post("/api/admin/workflows/test", (c) => withRequestAuth(c.env, c.executionCtx, async (auth) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const roles = String(session?.user?.role || "").split(",").map((role) => role.trim());
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  if (!roles.includes("admin")) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
  const env = c.env as WorkflowsEnv;
  const id = `starter-test-${crypto.randomUUID()}`;
  const instance = await env.STARTER_WORKFLOW.create({ id, params: { requestedBy: session.user.id, correlationId: id } });
  return c.json({ data: { id: instance.id, workflow: env.WORKFLOW_NAME } }, 201, { "Cache-Control": "no-store" });
}));
feature.get("/api/admin/workflows/:id", (c) => withRequestAuth(c.env, c.executionCtx, async (auth) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const roles = String(session?.user?.role || "").split(",").map((role) => role.trim());
  if (!session?.user) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }, 401);
  if (!roles.includes("admin")) return c.json({ error: { code: "FORBIDDEN", message: "Admin role required." } }, 403);
  const instance = await (c.env as WorkflowsEnv).STARTER_WORKFLOW.get(c.req.param("id"));
  return c.json({ data: await instance.status() }, 200, { "Cache-Control": "no-store" });
}));
export const workflowsFeature = feature;
