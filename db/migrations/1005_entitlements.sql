create table "app_billing_plan" (
  "id" text not null primary key,
  "name" text not null,
  "active" boolean not null default true,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp
);

create table "app_billing_plan_entitlement" (
  "plan_id" text not null references "app_billing_plan" ("id") on delete cascade,
  "feature_key" text not null,
  "enabled" boolean not null default true,
  "limit_value" bigint check (
    "limit_value" is null
    or ("limit_value" >= 0 and "limit_value" <= 9007199254740991)
  ),
  "metadata" jsonb not null default '{}'::jsonb,
  primary key ("plan_id", "feature_key")
);

create index "app_billing_plan_entitlement_feature_idx"
  on "app_billing_plan_entitlement" ("feature_key", "plan_id");

insert into "app_billing_plan" ("id", "name") values
  ('free', 'Free'),
  ('pro', 'Pro');

insert into "app_billing_plan_entitlement" ("plan_id", "feature_key", "enabled", "limit_value") values
  ('free', 'product.read', true, null),
  ('pro', 'product.read', true, null),
  ('pro', 'product.actions.monthly', true, 10000);
