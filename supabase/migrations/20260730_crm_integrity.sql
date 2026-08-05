-- LumiCRM relational integrity and automatic timestamps.
-- Safe to run after 20260730_crm_foundation.sql.

begin;

create or replace function public.lumicrm_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'crm_activities',
    'crm_files',
    'property_details',
    'client_requirements'
  ] loop
    execute format('drop trigger if exists lumicrm_set_updated_at on public.%I', table_name);
    execute format(
      'create trigger lumicrm_set_updated_at before update on public.%I for each row execute function public.lumicrm_set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create or replace function public.lumicrm_validate_owned_references()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'property_details' then
    if not exists (
      select 1 from public.properties p
      where p.id = new.property_id and p.user_id = new.user_id
    ) then
      raise exception 'Property does not belong to this LumiCRM user';
    end if;
  elsif tg_table_name = 'client_requirements' then
    if not exists (
      select 1 from public.clients c
      where c.id = new.client_id and c.user_id = new.user_id
    ) then
      raise exception 'Client does not belong to this LumiCRM user';
    end if;
  elsif tg_table_name in ('crm_activities', 'crm_files') then
    if new.client_id is not null and not exists (
      select 1 from public.clients c
      where c.id = new.client_id and c.user_id = new.user_id
    ) then
      raise exception 'Client reference belongs to another LumiCRM user';
    end if;

    if new.property_id is not null and not exists (
      select 1 from public.properties p
      where p.id = new.property_id and p.user_id = new.user_id
    ) then
      raise exception 'Property reference belongs to another LumiCRM user';
    end if;
  end if;

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'crm_activities',
    'crm_files',
    'property_details',
    'client_requirements'
  ] loop
    execute format('drop trigger if exists lumicrm_validate_owned_references on public.%I', table_name);
    execute format(
      'create trigger lumicrm_validate_owned_references before insert or update on public.%I for each row execute function public.lumicrm_validate_owned_references()',
      table_name
    );
  end loop;
end;
$$;

create index if not exists crm_files_client_created_idx
  on public.crm_files(client_id, created_at desc)
  where client_id is not null;

create index if not exists crm_files_property_created_idx
  on public.crm_files(property_id, created_at desc)
  where property_id is not null;

create index if not exists client_requirements_user_purpose_idx
  on public.client_requirements(user_id, purpose, updated_at desc);

commit;
