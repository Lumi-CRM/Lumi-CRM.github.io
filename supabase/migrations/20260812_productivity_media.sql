-- LumiCRM productivity, media and planning foundation.
-- Safe to apply after the 2026-08-05 public product migration.

begin;

alter table public.tasks
  add column if not exists due_time time;

alter table public.crm_files
  add column if not exists is_primary boolean not null default false;

create unique index if not exists crm_files_one_primary_property_image_uidx
  on public.crm_files(property_id)
  where bucket = 'crm-images' and is_primary and property_id is not null;

create table if not exists public.monthly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'План работы',
  starts_on date not null,
  ends_on date not null,
  targets jsonb not null default '{}'::jsonb,
  weekly_targets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index if not exists monthly_plans_user_dates_idx
  on public.monthly_plans(user_id, starts_on desc, ends_on desc);

alter table public.monthly_plans enable row level security;
drop policy if exists "Users manage own monthly plans" on public.monthly_plans;
create policy "Users manage own monthly plans" on public.monthly_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists lumicrm_set_updated_at on public.monthly_plans;
create trigger lumicrm_set_updated_at
  before update on public.monthly_plans
  for each row execute function public.lumicrm_set_updated_at();

create table if not exists public.property_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  slug uuid not null default gen_random_uuid() unique,
  snapshot jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, property_id)
);

alter table public.property_shares enable row level security;
drop policy if exists "Anyone reads active property shares" on public.property_shares;
create policy "Anyone reads active property shares" on public.property_shares
  for select using (active or auth.uid() = user_id);
drop policy if exists "Users create own property shares" on public.property_shares;
create policy "Users create own property shares" on public.property_shares
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own property shares" on public.property_shares;
create policy "Users update own property shares" on public.property_shares
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users delete own property shares" on public.property_shares;
create policy "Users delete own property shares" on public.property_shares
  for delete using (auth.uid() = user_id);

drop trigger if exists lumicrm_set_updated_at on public.property_shares;
create trigger lumicrm_set_updated_at
  before update on public.property_shares
  for each row execute function public.lumicrm_set_updated_at();

commit;
