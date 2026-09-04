create table if not exists app_auth_secondary_store (
  key text primary key,
  value text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default current_timestamp
);

create index if not exists app_auth_secondary_store_expiry_idx
on app_auth_secondary_store (expires_at)
where expires_at is not null;
