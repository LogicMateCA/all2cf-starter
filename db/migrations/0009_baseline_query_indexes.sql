create index "app_user_lower_email_idx"
  on "app_user" (lower("email"));

create index "app_support_message_author_created_idx"
  on "app_support_message" ("author_user_id", "created_at" desc)
  where "author_user_id" is not null;

create index "app_announcement_creator_created_idx"
  on "app_announcement" ("created_by_user_id", "created_at" desc)
  where "created_by_user_id" is not null;

create index "app_notification_created_idx"
  on "app_notification" ("created_at" desc);
