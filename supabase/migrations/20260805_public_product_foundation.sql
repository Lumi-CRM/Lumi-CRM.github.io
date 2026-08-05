-- LumiCRM public product foundation.
-- Adds per-account onboarding/preferences and the storage model for cross-device notifications.

begin;

alter table public.profiles
  add column if not exists onboarding_completed boolean,
  add column if not exists preferences jsonb not null default '{"theme":"midnight","iconSize":"comfortable","density":"comfortable","navigationPosition":"left"}'::jsonb,
  add column if not exists notification_preferences jsonb not null default '{"enabled":true,"newRequests":true,"taskReminders":true,"meetingReminders":true,"reminderMinutes":60}'::jsonb,
  add column if not exists locale text not null default 'ru-RU',
  add column if not exists timezone text not null default 'Europe/Moscow',
  add column if not exists updated_at timestamptz not null default now();

-- Existing private-office accounts have already used LumiCRM. Only accounts created
-- after this migration should automatically start the onboarding flow.
update public.profiles
set onboarding_completed = true
where onboarding_completed is null;

alter table public.profiles
  alter column onboarding_completed set default false,
  alter column onboarding_completed set not null;

drop trigger if exists lumicrm_set_updated_at on public.profiles;
create trigger lumicrm_set_updated_at
  before update on public.profiles
  for each row execute function public.lumicrm_set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  body text,
  link text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  platform text not null default 'web',
  device_name text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

create index if not exists push_subscriptions_user_enabled_idx
  on public.push_subscriptions(user_id, enabled)
  where enabled = true;

drop trigger if exists lumicrm_set_updated_at on public.push_subscriptions;
create trigger lumicrm_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.lumicrm_set_updated_at();

alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications" on public.notifications
  for delete using (auth.uid() = user_id);

drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;
create policy "Users manage own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    first_name,
    last_name,
    middle_name,
    phone,
    position,
    onboarding_completed
  ) values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'middle_name',
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'position', 'Риелтор'),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
