alter table app_api_key drop constraint if exists app_api_key_reference_id_fkey;

create or replace function app_api_key_validate_reference()
returns trigger
language plpgsql
as $$
declare
  owner_exists boolean := false;
begin
  if new.config_id = 'user-keys' then
    select exists(select 1 from app_user where id = new.reference_id) into owner_exists;
  elsif new.config_id = 'org-keys' then
    if to_regclass('public.app_organization') is not null then
      execute 'select exists(select 1 from app_organization where id = $1)' into owner_exists using new.reference_id;
    end if;
  else
    raise exception 'Unknown API key configuration %', new.config_id using errcode = '23514';
  end if;
  if not owner_exists then
    raise exception 'API key owner does not exist for configuration %', new.config_id using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists app_api_key_validate_reference on app_api_key;
create trigger app_api_key_validate_reference
before insert or update of config_id, reference_id on app_api_key
for each row execute function app_api_key_validate_reference();

create or replace function app_delete_owned_api_keys()
returns trigger
language plpgsql
as $$
begin
  delete from app_api_key
  where reference_id = old.id
    and config_id = case when tg_table_name = 'app_user' then 'user-keys' else 'org-keys' end;
  return old;
end;
$$;

drop trigger if exists app_user_delete_api_keys on app_user;
create trigger app_user_delete_api_keys before delete on app_user
for each row execute function app_delete_owned_api_keys();

do $$
begin
  if to_regclass('public.app_organization') is not null then
    execute 'drop trigger if exists app_organization_delete_api_keys on app_organization';
    execute 'create trigger app_organization_delete_api_keys before delete on app_organization for each row execute function app_delete_owned_api_keys()';
  end if;
end;
$$;
