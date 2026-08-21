create table "app_webhook_endpoint" (
  "id" text not null primary key,
  "owner_user_id" text not null references "app_user" ("id") on delete cascade,
  "url" text not null check (char_length("url") between 8 and 2048),
  "description" text not null default '' check (char_length("description") <= 200),
  "event_types" text[] not null check (cardinality("event_types") between 1 and 20),
  "enabled" boolean not null default true,
  "secret_version" integer not null default 1 check ("secret_version" > 0),
  "archived_at" timestamptz,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp
);

create unique index "app_webhook_endpoint_owner_url_active_idx"
  on "app_webhook_endpoint" ("owner_user_id", "url")
  where "archived_at" is null;

create index "app_webhook_endpoint_owner_active_idx"
  on "app_webhook_endpoint" ("owner_user_id", "created_at" desc)
  where "archived_at" is null;

create table "app_webhook_event" (
  "id" text not null primary key,
  "owner_user_id" text not null references "app_user" ("id") on delete cascade,
  "event_type" text not null check (char_length("event_type") between 3 and 100),
  "payload" jsonb not null,
  "created_at" timestamptz not null default current_timestamp
);

create index "app_webhook_event_owner_created_idx"
  on "app_webhook_event" ("owner_user_id", "created_at" desc);

create table "app_webhook_delivery" (
  "id" text not null primary key,
  "event_id" text not null references "app_webhook_event" ("id") on delete cascade,
  "endpoint_id" text not null references "app_webhook_endpoint" ("id") on delete cascade,
  "secret_version" integer not null check ("secret_version" > 0),
  "status" text not null default 'pending' check ("status" in ('pending', 'delivering', 'retrying', 'succeeded', 'failed')),
  "attempt_count" integer not null default 0 check ("attempt_count" between 0 and 100),
  "response_status" integer check ("response_status" between 100 and 599),
  "response_excerpt" text check (char_length("response_excerpt") <= 1024),
  "last_error" text check (char_length("last_error") <= 500),
  "delivered_at" timestamptz,
  "last_attempt_at" timestamptz,
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  unique ("event_id", "endpoint_id")
);

create index "app_webhook_delivery_endpoint_created_idx"
  on "app_webhook_delivery" ("endpoint_id", "created_at" desc);

create index "app_webhook_delivery_status_created_idx"
  on "app_webhook_delivery" ("status", "created_at")
  where "status" in ('pending', 'delivering', 'retrying');
