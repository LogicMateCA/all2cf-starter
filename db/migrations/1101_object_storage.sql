create table app_object_storage (
  id text primary key,
  owner_user_id text not null references app_user(id) on delete cascade,
  provider text not null check (provider in ('cloudflare-r2', 's3-compatible')),
  bucket text not null,
  object_key text not null unique,
  file_name text not null,
  content_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  visibility text not null check (visibility in ('private', 'public')),
  etag text,
  created_at timestamptz not null default current_timestamp,
  deleted_at timestamptz
);

create index app_object_storage_owner_created_idx
  on app_object_storage (owner_user_id, created_at desc, id desc)
  where deleted_at is null;

create index app_object_storage_public_idx
  on app_object_storage (id)
  where visibility = 'public' and deleted_at is null;
