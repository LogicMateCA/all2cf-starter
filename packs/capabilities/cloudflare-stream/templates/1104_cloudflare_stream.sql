create table app_stream_asset (
  id text primary key,
  owner_user_id text not null references app_user(id) on delete cascade,
  stream_uid text not null unique,
  file_name text not null,
  status text not null check (status in ('upload_pending', 'queued', 'inprogress', 'ready', 'error', 'deleted')),
  ready_to_stream boolean not null default false,
  pct_complete numeric,
  thumbnail_url text,
  hls_url text,
  dash_url text,
  error_code text,
  error_text text,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  deleted_at timestamptz
);

create index app_stream_asset_owner_created_idx on app_stream_asset (owner_user_id, created_at desc) where deleted_at is null;

create table app_stream_webhook_event (
  signature text primary key,
  stream_uid text not null,
  received_at timestamptz not null default current_timestamp
);
