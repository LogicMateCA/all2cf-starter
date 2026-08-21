create table "app_announcement" (
  "id" text primary key,
  "title" text not null check (char_length("title") between 3 and 160),
  "body" text not null check (char_length("body") between 10 and 2000),
  "deep_link" text not null default '/app/notifications',
  "created_by_user_id" text references "app_user" ("id") on delete set null,
  "created_at" timestamptz not null default current_timestamp
);

create index "app_announcement_created_idx"
  on "app_announcement" ("created_at" desc, "id" desc);
