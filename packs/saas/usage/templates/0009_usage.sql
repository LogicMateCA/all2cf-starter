create table "app_usage_event" (
  "id" text not null primary key,
  "subject_user_id" text not null references "app_user" ("id") on delete cascade,
  "metric_key" text not null,
  "period_start" timestamptz not null,
  "period_end" timestamptz not null,
  "amount" bigint not null check ("amount" > 0),
  "idempotency_key" text not null,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamptz not null default current_timestamp,
  unique ("subject_user_id", "metric_key", "period_start", "idempotency_key")
);

create index "app_usage_event_subject_period_idx"
  on "app_usage_event" ("subject_user_id", "period_start" desc, "metric_key");

create table "app_usage_bucket" (
  "subject_user_id" text not null references "app_user" ("id") on delete cascade,
  "metric_key" text not null,
  "period_start" timestamptz not null,
  "period_end" timestamptz not null,
  "consumed" bigint not null default 0 check ("consumed" >= 0),
  "updated_at" timestamptz not null default current_timestamp,
  primary key ("subject_user_id", "metric_key", "period_start")
);

create index "app_usage_bucket_period_idx"
  on "app_usage_bucket" ("period_start" desc, "metric_key");
