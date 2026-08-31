create or replace function app_assign_initial_administrator()
returns trigger
language plpgsql
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('starter.initial-platform-administrator', 0));
  if not exists (select 1 from app_user) then
    new.role := 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists app_user_assign_initial_administrator on app_user;
create trigger app_user_assign_initial_administrator
before insert on app_user
for each row execute function app_assign_initial_administrator();

create or replace function app_protect_last_administrator()
returns trigger
language plpgsql
as $$
declare
  old_is_admin boolean := 'admin' = any(string_to_array(replace(coalesce(old.role, ''), ' ', ''), ','));
  new_is_admin boolean := case
    when tg_op = 'DELETE' then false
    else 'admin' = any(string_to_array(replace(coalesce(new.role, ''), ' ', ''), ','))
  end;
begin
  if old_is_admin and not new_is_admin then
    perform pg_advisory_xact_lock(hashtextextended('starter.initial-platform-administrator', 0));
    if not exists (
      select 1
      from app_user
      where id <> old.id
        and 'admin' = any(string_to_array(replace(coalesce(role, ''), ' ', ''), ','))
    ) then
      raise exception 'At least one platform administrator is required';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists app_user_protect_last_administrator on app_user;
create trigger app_user_protect_last_administrator
before update or delete on app_user
for each row execute function app_protect_last_administrator();

do $$
declare
  first_user_id text;
begin
  perform pg_advisory_xact_lock(hashtextextended('starter.initial-platform-administrator', 0));
  if exists (select 1 from app_user)
     and not exists (
       select 1 from app_user
       where 'admin' = any(string_to_array(replace(coalesce(role, ''), ' ', ''), ','))
     ) then
    select id into first_user_id
    from app_user
    order by created_at asc, id asc
    limit 1;
    update app_user set role = 'admin', updated_at = now() where id = first_user_id;
  end if;
end;
$$;
