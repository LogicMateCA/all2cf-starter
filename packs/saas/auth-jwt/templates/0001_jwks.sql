create table app_jwks (id text primary key, public_key text not null, private_key text not null, created_at timestamptz not null default current_timestamp, expires_at timestamptz);
