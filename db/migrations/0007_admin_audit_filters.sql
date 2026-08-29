create index "app_admin_audit_event_action_created_idx"
  on "app_admin_audit_event" ("action", "created_at" desc, "id" desc);

create index "app_admin_audit_event_type_created_idx"
  on "app_admin_audit_event" ("target_type", "created_at" desc, "id" desc);

create index "app_admin_audit_event_created_idx"
  on "app_admin_audit_event" ("created_at" desc, "id" desc);
