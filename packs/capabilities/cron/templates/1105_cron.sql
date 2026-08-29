create table app_cron_heartbeat (
  cron_expression text primary key,
  last_scheduled_at timestamptz not null,
  last_run_at timestamptz not null default current_timestamp,
  run_count bigint not null default 1,
  updated_at timestamptz not null default current_timestamp
);
