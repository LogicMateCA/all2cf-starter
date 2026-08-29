create table "app_onboarding_progress" (
  "user_id" text not null primary key references "app_user" ("id") on delete cascade,
  "definition_version" integer not null check ("definition_version" > 0),
  "completed_steps" text[] not null default '{}'::text[],
  "started_at" timestamptz not null default current_timestamp,
  "completed_at" timestamptz,
  "updated_at" timestamptz not null default current_timestamp
);

create index "app_onboarding_progress_completion_idx"
  on "app_onboarding_progress" ("completed_at", "updated_at" desc);
