alter table "app_support_ticket"
  add column "assigned_to_user_id" text references "app_user" ("id") on delete set null;

create index "app_support_ticket_assignee_updated_idx"
  on "app_support_ticket" ("assigned_to_user_id", "updated_at" desc);

create table "app_support_message" (
  "id" text primary key,
  "ticket_id" text not null references "app_support_ticket" ("id") on delete cascade,
  "author_user_id" text references "app_user" ("id") on delete set null,
  "author_role" text not null check ("author_role" in ('customer', 'admin', 'system')),
  "visibility" text not null default 'public' check ("visibility" in ('public', 'internal')),
  "body" text not null check (char_length("body") between 1 and 5000),
  "created_at" timestamptz not null default current_timestamp
);

create index "app_support_message_ticket_created_idx"
  on "app_support_message" ("ticket_id", "created_at");

create table "app_support_attachment" (
  "id" text primary key,
  "ticket_id" text not null references "app_support_ticket" ("id") on delete cascade,
  "message_id" text references "app_support_message" ("id") on delete cascade,
  "uploaded_by_user_id" text references "app_user" ("id") on delete set null,
  "object_key" text not null unique,
  "file_name" text not null check (char_length("file_name") between 1 and 240),
  "media_type" text not null check (char_length("media_type") between 1 and 160),
  "byte_size" bigint not null check ("byte_size" between 1 and 10485760),
  "status" text not null default 'pending' check ("status" in ('pending', 'ready', 'rejected')),
  "created_at" timestamptz not null default current_timestamp
);

create index "app_support_attachment_ticket_idx"
  on "app_support_attachment" ("ticket_id", "created_at");
