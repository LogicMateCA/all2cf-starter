import type { Pool } from "pg";
import type { AuthRuntimeEnv } from "./auth-runtime";
import { selectedSocialProviders } from "../../scripts/lib/social-providers.mjs";
import type { SocialProviderId } from "../../scripts/lib/social-providers.mjs";

export type OperationsHealthStatus =
  | "ok"
  | "attention"
  | "unknown"
  | "not-selected";

export type OperationsHealthComponent = {
  id: string;
  label: string;
  status: OperationsHealthStatus;
  summary: string;
  details: Record<string, boolean | number | string | null>;
};

type CountRow = {
  sent_24h: string;
  failed_24h: string;
  outstanding: string;
  last_success_at: string | null;
  last_failure_at: string | null;
};

function present(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

function requiredConfiguration(
  values: Array<[name: string, value: unknown]>,
) {
  const missing = values.filter(([, value]) => !present(value)).map(([name]) => name);
  return { configured: missing.length === 0, missing };
}

function databaseSummary(env: AuthRuntimeEnv) {
  return env.DATABASE_PROVIDER === "cfpg"
    ? "Active query completed through the CFPG Service Binding."
    : "Active query completed through Hyperdrive.";
}

async function relationExists(database: Pool, name: string) {
  const result = await database.query<{ relation: string | null }>(
    "select to_regclass($1)::text as relation",
    [`public.${name}`],
  );
  return Boolean(result.rows[0]?.relation);
}

export async function collectOperationsHealth(
  env: AuthRuntimeEnv,
  database: Pool,
) {
  const components: OperationsHealthComponent[] = [];
  const databaseStartedAt = performance.now();
  const databaseResult = await database.query<{ checked_at: string }>(
    "select now()::text as checked_at",
  );
  const databaseLatencyMs = Math.max(
    0,
    Math.round((performance.now() - databaseStartedAt) * 10) / 10,
  );
  components.push({
    id: "database",
    label: "PostgreSQL",
    status: "ok",
    summary: databaseSummary(env),
    details: {
      latencyMs: databaseLatencyMs,
      checkedAt: databaseResult.rows[0]?.checked_at || null,
    },
  });

  const emailProvider = String(env.AUTH_EMAIL_PROVIDER || "cfsend")
    .trim()
    .toLowerCase();
  const emailConfiguration =
    emailProvider === "cfsend"
      ? requiredConfiguration([
          ["CFSEND_API_URL", env.CFSEND_API_URL],
          ["CFSEND_API_KEY", env.CFSEND_API_KEY],
          ["CFSEND_FROM", env.CFSEND_FROM],
        ])
      : emailProvider === "resend"
        ? requiredConfiguration([
            ["RESEND_API_URL", env.RESEND_API_URL],
            ["RESEND_API_KEY", env.RESEND_API_KEY],
            ["RESEND_FROM", env.RESEND_FROM],
          ])
        : emailProvider === "cloudflare-email"
          ? requiredConfiguration([
              ["EMAIL", env.EMAIL],
              ["CLOUDFLARE_EMAIL_FROM", env.CLOUDFLARE_EMAIL_FROM],
            ])
          : { configured: false, missing: ["supported AUTH_EMAIL_PROVIDER"] };
  const emailEvidence = await database.query<CountRow>(
    `select
      count(*) filter (where status = 'sent' and sent_at > now() - interval '24 hours')::text as sent_24h,
      count(*) filter (where status = 'failed' and created_at > now() - interval '24 hours')::text as failed_24h,
      count(*) filter (where status in ('pending', 'sending'))::text as outstanding,
      max(sent_at)::text as last_success_at,
      max(created_at) filter (where status = 'failed')::text as last_failure_at
     from app_auth_email_outbox`,
  );
  const email = emailEvidence.rows[0];
  const emailFailed24h = Number(email?.failed_24h || 0);
  const emailOutstanding = Number(email?.outstanding || 0);
  const emailStatus =
    !emailConfiguration.configured || emailFailed24h > 0
      ? "attention"
      : "ok";
  components.push({
    id: "email",
    label: "Authentication email",
    status: emailStatus,
    summary: emailConfiguration.configured
      ? `${emailProvider} is configured with persisted delivery evidence.`
      : `${emailProvider} is missing required configuration.`,
    details: {
      provider: emailProvider,
      configured: emailConfiguration.configured,
      missing: emailConfiguration.missing.join(", ") || null,
      sent24h: Number(email?.sent_24h || 0),
      failed24h: emailFailed24h,
      outstanding: emailOutstanding,
      lastSuccessAt: email?.last_success_at || null,
      lastFailureAt: email?.last_failure_at || null,
    },
  });

  const selectedSocial = new Set(selectedSocialProviders(env));
  const socialConfigurations: Array<{
    id: SocialProviderId;
    label: string;
    values: Array<[string, unknown]>;
  }> = [
    {
      id: "google",
      label: "Google sign-in",
      values: [
        ["GOOGLE_CLIENT_ID", env.GOOGLE_CLIENT_ID],
        ["GOOGLE_CLIENT_SECRET", env.GOOGLE_CLIENT_SECRET],
      ] as Array<[string, unknown]>,
    },
    {
      id: "github",
      label: "GitHub sign-in",
      values: [
        ["GITHUB_CLIENT_ID", env.GITHUB_CLIENT_ID],
        ["GITHUB_CLIENT_SECRET", env.GITHUB_CLIENT_SECRET],
      ] as Array<[string, unknown]>,
    },
    {
      id: "apple",
      label: "Apple sign-in",
      values: [
        ["APPLE_CLIENT_ID", env.APPLE_CLIENT_ID],
        ["APPLE_TEAM_ID", env.APPLE_TEAM_ID],
        ["APPLE_KEY_ID", env.APPLE_KEY_ID],
        ["APPLE_PRIVATE_KEY_BASE64", env.APPLE_PRIVATE_KEY_BASE64],
        ["APPLE_APP_BUNDLE_IDENTIFIER", env.APPLE_APP_BUNDLE_IDENTIFIER],
      ] as Array<[string, unknown]>,
    },
  ];
  for (const provider of socialConfigurations) {
    if (!selectedSocial.has(provider.id)) {
      components.push({
        id: provider.id,
        label: provider.label,
        status: "not-selected",
        summary: "This social provider is not selected in the Blueprint.",
        details: { selected: false },
      });
      continue;
    }
    const configuration = requiredConfiguration(provider.values);
    components.push({
      id: provider.id,
      label: provider.label,
      status: configuration.configured ? "ok" : "attention",
      summary: configuration.configured
        ? "OAuth credentials are configured."
        : "OAuth credentials are incomplete.",
      details: {
        selected: true,
        configured: configuration.configured,
        missing: configuration.missing.join(", ") || null,
      },
    });
  }

  const turnstileSelected = env.TURNSTILE_PROVIDER === "turnstile";
  if (!turnstileSelected) {
    components.push({
      id: "turnstile",
      label: "Cloudflare Turnstile",
      status: "not-selected",
      summary: "Turnstile anti-abuse is not materialized.",
      details: { selected: false },
    });
  } else {
    const turnstileConfiguration = requiredConfiguration([
      ["TURNSTILE_SITE_KEY", env.TURNSTILE_SITE_KEY],
      ["TURNSTILE_SECRET_KEY", env.TURNSTILE_SECRET_KEY],
    ]);
    components.push({
      id: "turnstile",
      label: "Cloudflare Turnstile",
      status: turnstileConfiguration.configured ? "ok" : "attention",
      summary: turnstileConfiguration.configured
        ? "The selected environment widget and server verification secret are configured."
        : "Selected Turnstile configuration is incomplete.",
      details: {
        selected: true,
        configured: turnstileConfiguration.configured,
        missing: turnstileConfiguration.missing.join(", ") || null,
      },
    });
  }

  const stripeTable = await relationExists(database, "app_stripe_webhook_event");
  const stripeSelected =
    stripeTable ||
    present(env.STRIPE_SECRET_KEY) ||
    present(env.STRIPE_WEBHOOK_SECRET) ||
    present(env.STRIPE_PRICE_PRO);
  if (!stripeSelected) {
    components.push({
      id: "stripe",
      label: "Stripe",
      status: "not-selected",
      summary: "Stripe Billing is not materialized.",
      details: { selected: false },
    });
  } else {
    const stripeConfiguration = requiredConfiguration([
      ["STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY],
      ["STRIPE_WEBHOOK_SECRET", env.STRIPE_WEBHOOK_SECRET],
      ["STRIPE_PRICE_PRO", env.STRIPE_PRICE_PRO],
    ]);
    const stripeEvidence = stripeTable
      ? await database.query<{
          events_24h: string;
          last_received_at: string | null;
        }>(
          `select
            count(*) filter (where last_received_at > now() - interval '24 hours')::text as events_24h,
            max(last_received_at)::text as last_received_at
           from app_stripe_webhook_event`,
        )
      : null;
    components.push({
      id: "stripe",
      label: "Stripe",
      status:
        stripeConfiguration.configured && stripeTable ? "ok" : "attention",
      summary:
        stripeConfiguration.configured && stripeTable
          ? "Billing configuration and webhook ledger are ready."
          : "Selected Stripe Billing is incomplete.",
      details: {
        selected: true,
        configured: stripeConfiguration.configured,
        missing: stripeConfiguration.missing.join(", ") || null,
        ledgerReady: stripeTable,
        events24h: Number(stripeEvidence?.rows[0]?.events_24h || 0),
        lastReceivedAt: stripeEvidence?.rows[0]?.last_received_at || null,
      },
    });
  }

  const webhookTable = await relationExists(database, "app_webhook_delivery");
  const queueBound = Boolean(env.OUTGOING_WEBHOOK_QUEUE);
  const queueSelected = webhookTable || queueBound;
  if (!queueSelected) {
    components.push({
      id: "outgoing-webhooks",
      label: "Outgoing webhook Queue",
      status: "not-selected",
      summary: "Outgoing Webhooks are not materialized.",
      details: { selected: false },
    });
  } else {
    const queueEvidence = webhookTable
      ? await database.query<CountRow>(
          `select
            count(*) filter (where status = 'succeeded' and delivered_at > now() - interval '24 hours')::text as sent_24h,
            count(*) filter (where status = 'failed' and updated_at > now() - interval '24 hours')::text as failed_24h,
            count(*) filter (where status in ('pending', 'delivering', 'retrying'))::text as outstanding,
            max(delivered_at)::text as last_success_at,
            max(updated_at) filter (where status = 'failed')::text as last_failure_at
           from app_webhook_delivery`,
        )
      : null;
    const queue = queueEvidence?.rows[0];
    const queueFailed24h = Number(queue?.failed_24h || 0);
    const queueReady = queueBound && webhookTable;
    components.push({
      id: "outgoing-webhooks",
      label: "Outgoing webhook Queue",
      status: !queueReady || queueFailed24h > 0 ? "attention" : "ok",
      summary: queueReady
        ? "Queue binding and delivery ledger are ready."
        : "Selected outgoing webhooks are missing a Queue binding or ledger.",
      details: {
        selected: true,
        queueBound,
        ledgerReady: webhookTable,
        succeeded24h: Number(queue?.sent_24h || 0),
        failed24h: queueFailed24h,
        outstanding: Number(queue?.outstanding || 0),
        lastSuccessAt: queue?.last_success_at || null,
        lastFailureAt: queue?.last_failure_at || null,
      },
    });
  }

  return {
    status: components.some(({ status }) => status === "attention")
      ? "attention"
      : "ok",
    environment: env.APP_ENV,
    service: env.SERVICE_NAME,
    checkedAt: new Date().toISOString(),
    components,
  };
}
