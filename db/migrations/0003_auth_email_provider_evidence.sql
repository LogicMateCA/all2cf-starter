alter table app_auth_email_outbox add column if not exists provider_message_id text;
alter table app_auth_email_outbox add column if not exists failure_code text;

create index if not exists app_auth_email_outbox_provider_message_idx
  on app_auth_email_outbox (delivery_mode, provider_message_id)
  where provider_message_id is not null;
