-- LumiCRM offline-first workflows, recoverable trash and SMART tasks.
-- Safe to apply after 20260812_productivity_media.sql.

begin;

alter table public.properties
  add column if not exists work_stream text not null default 'active',
  add column if not exists deleted_at timestamptz;

alter table public.clients add column if not exists deleted_at timestamptz;
alter table public.tasks
  add column if not exists smart_criteria jsonb not null default '{}'::jsonb,
  add column if not exists eisenhower_quadrant text not null default 'plan',
  add column if not exists deleted_at timestamptz;
alter table public.events add column if not exists deleted_at timestamptz;
alter table public.deals add column if not exists deleted_at timestamptz;
alter table public.crm_activities add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'properties_work_stream_check') then
    alter table public.properties add constraint properties_work_stream_check
      check (work_stream in ('active', 'cold'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_eisenhower_quadrant_check') then
    alter table public.tasks add constraint tasks_eisenhower_quadrant_check
      check (eisenhower_quadrant in ('do', 'plan', 'delegate', 'eliminate'));
  end if;
end $$;

create index if not exists properties_user_work_stream_idx
  on public.properties(user_id, work_stream, created_at desc) where deleted_at is null;
create index if not exists properties_user_deleted_idx
  on public.properties(user_id, deleted_at desc) where deleted_at is not null;
create index if not exists clients_user_deleted_idx
  on public.clients(user_id, deleted_at desc) where deleted_at is not null;
create index if not exists tasks_user_deleted_idx
  on public.tasks(user_id, deleted_at desc) where deleted_at is not null;

create or replace function public.purge_lumicrm_trash()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer := 0;
  affected integer := 0;
begin
  delete from public.crm_files
  where property_id in (select id from public.properties where deleted_at < now() - interval '5 days')
     or client_id in (select id from public.clients where deleted_at < now() - interval '5 days');

  delete from public.crm_activities where deleted_at < now() - interval '5 days';
  get diagnostics affected = row_count; removed := removed + affected;
  delete from public.deals where deleted_at < now() - interval '5 days';
  get diagnostics affected = row_count; removed := removed + affected;
  delete from public.events where deleted_at < now() - interval '5 days';
  get diagnostics affected = row_count; removed := removed + affected;
  delete from public.tasks where deleted_at < now() - interval '5 days';
  get diagnostics affected = row_count; removed := removed + affected;
  delete from public.properties where deleted_at < now() - interval '5 days';
  get diagnostics affected = row_count; removed := removed + affected;
  delete from public.clients where deleted_at < now() - interval '5 days';
  get diagnostics affected = row_count; removed := removed + affected;
  return removed;
end;
$$;

revoke all on function public.purge_lumicrm_trash() from public;
grant execute on function public.purge_lumicrm_trash() to authenticated;

do $$
begin
  create extension if not exists pg_cron;
  if not exists (select 1 from cron.job where jobname = 'lumicrm-trash-purge') then
    perform cron.schedule('lumicrm-trash-purge', '17 3 * * *', 'select public.purge_lumicrm_trash();');
  end if;
exception when others then
  raise notice 'pg_cron is unavailable; LumiCRM will purge expired trash when a user opens it: %', sqlerrm;
end $$;

commit;
