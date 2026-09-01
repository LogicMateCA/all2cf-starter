create table if not exists app_platform_setting (
  key text primary key,
  value jsonb not null,
  updated_by_user_id text references app_user(id) on delete set null,
  updated_at timestamptz not null default current_timestamp,
  check (key in ('product_name','support_email','default_locale','signup_policy'))
);

insert into app_platform_setting(key,value) values
  ('product_name','"Cloudflare AI Starter"'::jsonb),
  ('support_email','""'::jsonb),
  ('default_locale','"en"'::jsonb),
  ('signup_policy','"open"'::jsonb)
on conflict (key) do nothing;
