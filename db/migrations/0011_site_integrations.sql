create table if not exists app_site_integration (
  id text primary key,
  name text not null check (char_length(name) between 2 and 80),
  provider text not null check (provider in ('cloudflare-web-analytics', 'google-analytics', 'google-tag-manager', 'plausible', 'custom-external')),
  status text not null default 'draft' check (status in ('draft', 'published', 'disabled')),
  environment text not null check (environment in ('development', 'production')),
  surfaces text[] not null default array['marketing']::text[],
  config jsonb not null default '{}'::jsonb,
  csp_sources jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_by_user_id text references app_user(id) on delete set null,
  updated_by_user_id text references app_user(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (surfaces <@ array['marketing', 'web', 'docs']::text[]),
  check (cardinality(surfaces) > 0)
);

create table if not exists app_site_integration_revision (
  id text primary key,
  integration_id text not null references app_site_integration(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  created_by_user_id text references app_user(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (integration_id, version)
);

create index if not exists app_site_integration_runtime_idx
  on app_site_integration (environment, status, updated_at desc);

create index if not exists app_site_integration_revision_idx
  on app_site_integration_revision (integration_id, version desc);
