create unique index "app_account_provider_account_uidx" on "app_account" ("provider_id", "account_id");

create table "app_auth_email_outbox" (
  "id" text primary key,
  "kind" text not null check ("kind" in ('email-verification', 'password-reset')),
  "recipient" text not null,
  "subject" text not null,
  "text_body" text not null,
  "action_url" text not null,
  "delivery_mode" text not null,
  "status" text not null default 'pending' check ("status" in ('pending', 'sending', 'sent', 'failed')),
  "attempt_count" integer not null default 0,
  "last_error" text,
  "created_at" timestamptz not null default current_timestamp,
  "sent_at" timestamptz
);

create index "app_auth_email_outbox_pending_idx" on "app_auth_email_outbox" ("status", "created_at");
