create table app_push_device (
  id text primary key,
  user_id text not null references app_user(id) on delete cascade,
  expo_push_token text not null unique,
  project_id text not null,
  platform text not null check (platform in ('ios', 'android')),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default current_timestamp,
  last_ticket_id text,
  last_error text,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);

create index app_push_device_user_enabled_idx
  on app_push_device (user_id, enabled, updated_at desc);

create table app_push_delivery (
  id text primary key,
  user_id text not null references app_user(id) on delete cascade,
  device_id text not null references app_push_device(id) on delete cascade,
  ticket_id text,
  status text not null check (status in ('accepted', 'error')),
  error_code text,
  created_at timestamptz not null default current_timestamp
);

create index app_push_delivery_user_created_idx
  on app_push_delivery (user_id, created_at desc);
