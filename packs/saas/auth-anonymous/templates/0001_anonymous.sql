alter table app_user add column if not exists is_anonymous boolean not null default false;
