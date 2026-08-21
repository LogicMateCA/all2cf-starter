import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";

type SelectedFeatures = { organizations: boolean; stripeBilling: boolean };

function required(value: string | undefined, name: string) {
  if (!value?.trim()) throw new Error(`${name} is required while saas.billing-stripe is selected`);
  return value.trim();
}

export async function recordBillingNotification(
  database: SelectedAuthPluginInput["database"],
  eventId: string,
  referenceId: string,
  title: string,
  body: string,
) {
  const owner = await database.query<{ id: string }>(
    "select id from app_user where id = $1 limit 1",
    [referenceId],
  );
  if (!owner.rows[0]) return false;
  await database.query(
    `insert into app_notification
     (id, recipient_user_id, category, title, body, deep_link)
     values ($1, $2, 'billing', $3, $4, '/app/billing')
     on conflict (id) do nothing`,
    [`billing:${eventId}:${referenceId}`, referenceId, title, body],
  );
  return true;
}

export function createStripeAuthPlugin(input: SelectedAuthPluginInput, _features: SelectedFeatures) {
  const secretKey = required(input.stripeSecretKey, "STRIPE_SECRET_KEY");
  const webhookSecret = required(input.stripeWebhookSecret, "STRIPE_WEBHOOK_SECRET");
  const proPrice = required(input.stripePricePro, "STRIPE_PRICE_PRO");
  if (input.appEnvironment === "development" && !/^[rs]k_test_/u.test(secretKey)) throw new Error("Development Stripe credentials must use a test key");
  if (input.appEnvironment === "production" && !/^[rs]k_live_/u.test(secretKey)) throw new Error("Production Stripe credentials must use a live key");
  if (input.appEnvironment !== "schema" && !webhookSecret.startsWith("whsec_")) throw new Error("STRIPE_WEBHOOK_SECRET must be a Stripe endpoint signing secret");
  if (input.appEnvironment !== "schema" && !proPrice.startsWith("price_")) throw new Error("STRIPE_PRICE_PRO must be a Stripe Price ID");
  const stripeClient = new Stripe(secretKey, {
    apiVersion: "2026-07-29.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
    timeout: 10_000,
    appInfo: { name: "AI Starter assembled product", version: "0.1.0", url: input.baseURL },
  });

  return stripe({
    stripeClient,
    stripeWebhookSecret: webhookSecret,
    createCustomerOnSignUp: false,
    async onEvent(event) {
      await input.database.query(
        `insert into app_stripe_webhook_event (event_id, event_type, livemode, provider_created_at, received_count, first_received_at, last_received_at)
         values ($1, $2, $3, to_timestamp($4), 1, now(), now())
         on conflict (event_id) do update set received_count = app_stripe_webhook_event.received_count + 1, last_received_at = now()`,
        [event.id, event.type, event.livemode, event.created],
      );
    },
    subscription: {
      enabled: true,
      requireEmailVerification: true,
      plans: [{ name: "pro", priceId: proPrice }],
      authorizeReference: async ({ user, referenceId }) => !referenceId || referenceId === user.id,
      getCheckoutSessionParams: async () => ({ params: { automatic_tax: { enabled: false } } }),
      async onSubscriptionComplete({ event, subscription, plan }) {
        await recordBillingNotification(
          input.database,
          event.id,
          subscription.referenceId,
          "Subscription activated",
          `${plan.name} is now active for your account.`,
        );
      },
      async onSubscriptionCreated({ event, subscription }) {
        await recordBillingNotification(
          input.database,
          event.id,
          subscription.referenceId,
          "Subscription created",
          `${subscription.plan} subscription details were received from Stripe.`,
        );
      },
      async onSubscriptionUpdate({ event, subscription }) {
        await recordBillingNotification(
          input.database,
          event.id,
          subscription.referenceId,
          "Subscription updated",
          `${subscription.plan} is now ${subscription.status}.`,
        );
      },
      async onSubscriptionCancel({ event, subscription }) {
        await recordBillingNotification(
          input.database,
          event.id,
          subscription.referenceId,
          "Subscription cancellation updated",
          `${subscription.plan} cancellation settings changed.`,
        );
      },
      async onSubscriptionDeleted({ event, subscription }) {
        await recordBillingNotification(
          input.database,
          event.id,
          subscription.referenceId,
          "Subscription ended",
          `${subscription.plan} is no longer active.`,
        );
      },
    },
    schema: {
      user: { fields: { stripeCustomerId: "stripe_customer_id" } },
      subscription: {
        modelName: "app_subscription",
        fields: {
          referenceId: "reference_id",
          stripeCustomerId: "stripe_customer_id",
          stripeSubscriptionId: "stripe_subscription_id",
          periodStart: "period_start",
          periodEnd: "period_end",
          cancelAtPeriodEnd: "cancel_at_period_end",
          cancelAt: "cancel_at",
          canceledAt: "canceled_at",
          endedAt: "ended_at",
          trialStart: "trial_start",
          trialEnd: "trial_end",
          billingInterval: "billing_interval",
          stripeScheduleId: "stripe_schedule_id"
        }
      }
    }
  });
}
