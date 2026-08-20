create table "app_support_ticket" (
  "id" text primary key,
  "created_by_user_id" text references "app_user" ("id") on delete set null,
  "contact_email" text not null,
  "kind" text not null check ("kind" in ('support', 'bug')),
  "subject" text not null check (char_length("subject") between 3 and 160),
  "body" text not null check (char_length("body") between 10 and 5000),
  "status" text not null default 'open' check ("status" in ('open', 'in_progress', 'resolved', 'closed')),
  "priority" text not null default 'normal' check ("priority" in ('low', 'normal', 'high')),
  "created_at" timestamptz not null default current_timestamp,
  "updated_at" timestamptz not null default current_timestamp,
  "resolved_at" timestamptz
);

create index "app_support_ticket_user_created_idx" on "app_support_ticket" ("created_by_user_id", "created_at" desc);
create index "app_support_ticket_status_updated_idx" on "app_support_ticket" ("status", "updated_at" desc);

create table "app_admin_audit_event" (
  "id" text primary key,
  "actor_user_id" text references "app_user" ("id") on delete set null,
  "action" text not null,
  "target_type" text not null,
  "target_id" text not null,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamptz not null default current_timestamp
);

create index "app_admin_audit_event_target_idx" on "app_admin_audit_event" ("target_type", "target_id", "created_at" desc);
create index "app_admin_audit_event_actor_idx" on "app_admin_audit_event" ("actor_user_id", "created_at" desc);
