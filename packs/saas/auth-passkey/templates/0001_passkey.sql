create table app_passkey (
  id text primary key,
  name text,
  public_key text not null,
  user_id text not null references app_user(id) on delete cascade,
  credential_id text not null unique,
  counter bigint not null default 0,
  device_type text not null,
  backed_up boolean not null default false,
  transports text,
  created_at timestamptz default current_timestamp,
  aaguid text
);
create index app_passkey_user_id_idx on app_passkey(user_id);
