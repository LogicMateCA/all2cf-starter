import { Hono } from "hono";
import { withRequestAuth, type AuthRuntimeEnv } from "../auth-runtime";

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export const productOnboarding = {
  version: 1,
  steps: [
    {
      id: "welcome",
      title: "Welcome to your workspace",
      description:
        "Confirm that this account is the workspace you want to use. Replace this Starter step with the copied product's real first-success journey.",
      actionLabel: "Review account settings",
      actionHref: "/app/settings",
    },
  ],
} satisfies { version: number; steps: OnboardingStep[] };

const onboarding = new Hono<{ Bindings: AuthRuntimeEnv }>();
const stepIds = productOnboarding.steps.map(({ id }) => id);

function isPlatformAdmin(user: unknown) {
  const role =
    typeof user === "object" && user && "role" in user
      ? String(user.role || "")
      : "";
  return role.split(",").map((value) => value.trim()).includes("admin");
}

function snapshot(completed: string[]) {
  const validCompleted = stepIds.filter((id) => completed.includes(id));
  const nextStep = productOnboarding.steps.find(
    ({ id }) => !validCompleted.includes(id),
  );
  return {
    definition: productOnboarding,
    completedSteps: validCompleted,
    complete: !nextStep,
    nextStepId: nextStep?.id || null,
  };
}

onboarding.get("/api/onboarding", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user)
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
        401,
      );
    const result = await database.query<{
      definition_version: number;
      completed_steps: string[];
    }>(
      `select definition_version, completed_steps from app_onboarding_progress where user_id = $1`,
      [session.user.id],
    );
    const progress = result.rows[0];
    const completed =
      progress?.definition_version === productOnboarding.version
        ? progress.completed_steps
        : progress?.completed_steps || [];
    return c.json({ data: snapshot(completed) }, 200, {
      "Cache-Control": "no-store",
    });
  }),
);

onboarding.post("/api/onboarding/complete", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user)
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
        401,
      );
    const body = await c.req.json<{ stepId?: unknown }>();
    const stepId = String(body.stepId || "");
    if (!stepIds.includes(stepId))
      return c.json(
        { error: { code: "INVALID_STEP", message: "Unknown onboarding step." } },
        400,
      );
    const client = await database.connect();
    try {
      await client.query("begin");
      await client.query(
        `select pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [session.user.id],
      );
      const current = await client.query<{
        definition_version: number;
        completed_steps: string[];
      }>(
        `select definition_version, completed_steps from app_onboarding_progress where user_id = $1`,
        [session.user.id],
      );
      const completed = stepIds.filter((id) =>
        (current.rows[0]?.completed_steps || []).includes(id),
      );
      const before = snapshot(completed);
      if (before.nextStepId !== stepId && !completed.includes(stepId)) {
        await client.query("rollback");
        return c.json(
          {
            error: {
              code: "STEP_ORDER",
              message: "Complete onboarding steps in order.",
            },
          },
          409,
        );
      }
      const nextCompleted = completed.includes(stepId)
        ? completed
        : [...completed, stepId];
      const next = snapshot(nextCompleted);
      await client.query(
        `insert into app_onboarding_progress
         (user_id, definition_version, completed_steps, completed_at)
         values ($1, $2, $3::text[], $4)
         on conflict (user_id) do update set
           definition_version = excluded.definition_version,
           completed_steps = excluded.completed_steps,
           completed_at = excluded.completed_at,
           updated_at = current_timestamp`,
        [
          session.user.id,
          productOnboarding.version,
          next.completedSteps,
          next.complete ? new Date() : null,
        ],
      );
      await client.query("commit");
      return c.json({ data: next });
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }),
);

onboarding.get("/api/admin/onboarding", (c) =>
  withRequestAuth(c.env, c.executionCtx, async (auth, database) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user)
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
        401,
      );
    if (!isPlatformAdmin(session.user))
      return c.json(
        { error: { code: "FORBIDDEN", message: "Platform Admin access required." } },
        403,
      );
    const result = await database.query<{
      users: string;
      started: string;
      completed: string;
    }>(
      `select
         (select count(*) from app_user)::text as users,
         count(*)::text as started,
         count(*) filter (
           where definition_version = $1 and cardinality(completed_steps) >= $2
         )::text as completed
       from app_onboarding_progress`,
      [productOnboarding.version, stepIds.length],
    );
    const row = result.rows[0];
    return c.json({
      data: {
        definitionVersion: productOnboarding.version,
        steps: stepIds.length,
        users: Number(row?.users || 0),
        started: Number(row?.started || 0),
        completed: Number(row?.completed || 0),
      },
    });
  }),
);

export const onboardingFeature = onboarding;
