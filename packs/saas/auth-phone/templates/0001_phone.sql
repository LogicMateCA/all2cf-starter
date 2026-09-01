alter table app_user add column if not exists phone_number text;
alter table app_user add column if not exists phone_number_verified boolean not null default false;
create unique index if not exists app_user_phone_number_uidx on app_user(phone_number) where phone_number is not null;
