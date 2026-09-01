create table "app_api_key" (
  "id" text primary key,
  "config_id" text not null default 'default',
  "name" text,
  "start" text,
  "prefix" text,
  "key" text not null,
  "reference_id" text not null,
  "refill_interval" bigint,
  "refill_amount" bigint,
  "last_refill_at" timestamptz,
  "enabled" boolean not null default true,
  "rate_limit_enabled" boolean not null default true,
  "rate_limit_time_window" bigint not null default 60000,
  "rate_limit_max" bigint not null default 60,
  "request_count" bigint not null default 0,
  "remaining" bigint,
  "last_request" timestamptz,
  "expires_at" timestamptz,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "permissions" text,
  "metadata" text
);

create index "app_api_key_config_id_idx" on "app_api_key" ("config_id");
create unique index "app_api_key_key_idx" on "app_api_key" ("key");
create index "app_api_key_reference_id_idx" on "app_api_key" ("reference_id");
