create table app_sms_delivery (
  id text primary key,
  idempotency_key text not null unique,
  actor_user_id text references app_user(id) on delete set null,
  kind text not null,
  recipient_hash text not null,
  recipient_last4 text not null,
  provider_sid text unique,
  status text not null check (status in ('pending', 'queued', 'accepted', 'sent', 'delivered', 'failed', 'undelivered')),
  error_code text,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);

create index app_sms_delivery_actor_created_idx
  on app_sms_delivery (actor_user_id, created_at desc);
