create table "app_notification" (
  "id" text primary key,
  "recipient_user_id" text not null references "app_user" ("id") on delete cascade,
  "category" text not null check (char_length("category") between 1 and 64),
  "title" text not null check (char_length("title") between 1 and 240),
  "body" text not null check (char_length("body") between 1 and 5000),
  "deep_link" text,
  "read_at" timestamptz,
  "created_at" timestamptz not null default current_timestamp
);

create index "app_notification_recipient_created_idx" on "app_notification" ("recipient_user_id", "created_at" desc);
create index "app_notification_recipient_unread_idx" on "app_notification" ("recipient_user_id", "read_at", "created_at" desc);
