alter table app_subscription add column if not exists product_key text not null default 'core';
alter table app_subscription add column if not exists source text not null default 'manual';
alter table app_subscription add column if not exists manual_reason text;
alter table app_subscription add column if not exists manual_expires_at timestamptz;

update app_subscription set source = 'stripe'
where stripe_subscription_id is not null and source = 'manual';

create unique index if not exists app_subscription_reference_product_uidx
  on app_subscription (reference_id, product_key);
