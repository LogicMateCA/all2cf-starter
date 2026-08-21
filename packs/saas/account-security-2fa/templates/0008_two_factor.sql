alter table "app_user"
  add column "two_factor_enabled" boolean not null default false;

create table "app_two_factor" (
  "id" text primary key,
  "user_id" text not null references "app_user" ("id") on delete cascade,
  "secret" text not null,
  "backup_codes" text not null,
  "verified" boolean not null default true,
  "failed_verification_count" integer not null default 0,
  "locked_until" timestamptz
);

create index "app_two_factor_user_id_idx" on "app_two_factor" ("user_id");
create index "app_two_factor_secret_idx" on "app_two_factor" ("secret");
