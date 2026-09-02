-- Release-candidate data model for contact 360, recurring tasks and deal workflow.

begin;

create table if not exists public.client_contact_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  kind text not null check (kind in ('phone', 'email')),
  label text,
  value text not null check (length(trim(value)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, client_id, kind, value)
);

create table if not exists public.client_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_client_id uuid not null references public.clients(id) on delete cascade,
  target_client_id uuid not null references public.clients(id) on delete cascade,
  relationship text not null check (length(trim(relationship)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_client_id <> target_client_id),
  unique(user_id, source_client_id, target_client_id, relationship)
);

create index if not exists client_contact_points_user_client_idx
  on public.client_contact_points(user_id, client_id, created_at);
create index if not exists client_relationships_user_source_idx
  on public.client_relationships(user_id, source_client_id, created_at);
create index if not exists client_relationships_user_target_idx
  on public.client_relationships(user_id, target_client_id, created_at);

alter table public.client_contact_points enable row level security;
alter table public.client_relationships enable row level security;
drop policy if exists "Users manage own client contact points" on public.client_contact_points;
create policy "Users manage own client contact points" on public.client_contact_points
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own client relationships" on public.client_relationships;
create policy "Users manage own client relationships" on public.client_relationships
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.client_contact_points to authenticated;
grant select, insert, update, delete on public.client_relationships to authenticated;

create or replace function public.lumicrm_validate_client_extras()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'client_contact_points' then
    if not exists (select 1 from public.clients c where c.id = new.client_id and c.user_id = new.user_id) then
      raise exception 'Client does not belong to this LumiCRM user';
    end if;
  else
    if not exists (select 1 from public.clients c where c.id = new.source_client_id and c.user_id = new.user_id)
      or not exists (select 1 from public.clients c where c.id = new.target_client_id and c.user_id = new.user_id) then
      raise exception 'Related client does not belong to this LumiCRM user';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists lumicrm_validate_client_extras on public.client_contact_points;
create trigger lumicrm_validate_client_extras before insert or update on public.client_contact_points
  for each row execute function public.lumicrm_validate_client_extras();
drop trigger if exists lumicrm_validate_client_extras on public.client_relationships;
create trigger lumicrm_validate_client_extras before insert or update on public.client_relationships
  for each row execute function public.lumicrm_validate_client_extras();

drop trigger if exists lumicrm_set_updated_at on public.client_contact_points;
create trigger lumicrm_set_updated_at before update on public.client_contact_points
  for each row execute function public.lumicrm_set_updated_at();
drop trigger if exists lumicrm_set_updated_at on public.client_relationships;
create trigger lumicrm_set_updated_at before update on public.client_relationships
  for each row execute function public.lumicrm_set_updated_at();

alter table public.tasks
  add column if not exists recurrence_rule text not null default 'none',
  add column if not exists parent_task_id uuid references public.tasks(id) on delete set null,
  add column if not exists subtasks jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_recurrence_rule_check') then
    alter table public.tasks add constraint tasks_recurrence_rule_check
      check (recurrence_rule in ('none', 'daily', 'weekly', 'monthly'));
  end if;
end;
$$;

create index if not exists tasks_user_parent_idx on public.tasks(user_id, parent_task_id)
  where parent_task_id is not null;

alter table public.deals
  add column if not exists stage text not null default 'preparation',
  add column if not exists expenses numeric not null default 0,
  add column if not exists loss_reason text,
  add column if not exists checklist jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'deals_stage_check') then
    alter table public.deals add constraint deals_stage_check
      check (stage in ('preparation', 'documents', 'approval', 'registration', 'settlement', 'completed', 'lost'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'deals_expenses_check') then
    alter table public.deals add constraint deals_expenses_check check (expenses >= 0);
  end if;
end;
$$;

create index if not exists deals_user_stage_idx on public.deals(user_id, stage, updated_at desc);

commit;
