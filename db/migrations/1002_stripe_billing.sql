alter table "app_user" add column "stripe_customer_id" text;
create unique index "app_user_stripe_customer_id_idx" on "app_user" ("stripe_customer_id") where "stripe_customer_id" is not null;

create table "app_subscription" (
  "id" text not null primary key,
  "plan" text not null,
  "reference_id" text not null,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "status" text not null default 'incomplete',
  "period_start" timestamptz,
  "period_end" timestamptz,
  "cancel_at_period_end" boolean default false,
  "cancel_at" timestamptz,
  "canceled_at" timestamptz,
  "ended_at" timestamptz,
  "seats" integer,
  "trial_start" timestamptz,
  "trial_end" timestamptz,
  "billing_interval" text,
  "stripe_schedule_id" text
);

create index "app_subscription_reference_id_idx" on "app_subscription" ("reference_id");
create unique index "app_subscription_stripe_subscription_id_idx" on "app_subscription" ("stripe_subscription_id") where "stripe_subscription_id" is not null;

create table "app_stripe_webhook_event" (
  "event_id" text not null primary key,
  "event_type" text not null,
  "livemode" boolean not null,
  "provider_created_at" timestamptz not null,
  "received_count" integer not null default 1,
  "first_received_at" timestamptz not null default current_timestamp,
  "last_received_at" timestamptz not null default current_timestamp
);
