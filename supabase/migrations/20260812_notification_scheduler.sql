-- Reliable reminder queue for tasks, calendar calls, meetings and follow-ups.

begin;

update public.profiles
set notification_preferences = notification_preferences || '{"callReminders":true}'::jsonb
where not (notification_preferences ? 'callReminders');

alter table public.notifications
  add column if not exists reminder_job_id uuid;

create unique index if not exists notifications_reminder_job_uidx
  on public.notifications(reminder_job_id)
  where reminder_job_id is not null;

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  preference_key text not null check (preference_key in ('taskReminders', 'callReminders', 'meetingReminders')),
  reminder_minutes integer not null check (reminder_minutes in (1440, 60, 5, 0)),
  due_at timestamptz not null,
  notify_at timestamptz not null,
  title text not null,
  body text,
  link text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'skipped', 'failed', 'cancelled')),
  attempts integer not null default 0,
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_type, source_id, reminder_minutes)
);

create index if not exists notification_jobs_due_idx
  on public.notification_jobs(notify_at, status)
  where status in ('pending', 'processing');
create index if not exists notification_jobs_user_idx
  on public.notification_jobs(user_id, notify_at desc);

drop trigger if exists lumicrm_set_updated_at on public.notification_jobs;
create trigger lumicrm_set_updated_at
  before update on public.notification_jobs
  for each row execute function public.lumicrm_set_updated_at();

alter table public.notification_jobs enable row level security;
drop policy if exists "Users read own notification jobs" on public.notification_jobs;
create policy "Users read own notification jobs" on public.notification_jobs
  for select using (auth.uid() = user_id);

create or replace function public.cancel_notification_schedule(p_source_type text, p_source_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notification_jobs
  set status = 'cancelled', locked_at = null
  where source_type = p_source_type
    and source_id = p_source_id
    and status in ('pending', 'processing');
$$;

create or replace function public.enqueue_notification_schedule(
  p_user_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_preference_key text,
  p_title text,
  p_body text,
  p_link text,
  p_due_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  reminder integer;
  reminder_at timestamptz;
begin
  perform public.cancel_notification_schedule(p_source_type, p_source_id);
  if p_due_at is null or p_due_at < now() - interval '90 seconds' then return; end if;

  foreach reminder in array array[1440, 60, 5, 0]
  loop
    reminder_at := p_due_at - make_interval(mins => reminder);
    if reminder_at >= now() - interval '90 seconds' then
      insert into public.notification_jobs (
        user_id, source_type, source_id, preference_key, reminder_minutes,
        due_at, notify_at, title, body, link, status, attempts, locked_at,
        sent_at, last_error
      ) values (
        p_user_id, p_source_type, p_source_id, p_preference_key, reminder,
        p_due_at, reminder_at, p_title, p_body, p_link, 'pending', 0, null,
        null, null
      )
      on conflict (source_type, source_id, reminder_minutes) do update set
        user_id = excluded.user_id,
        preference_key = excluded.preference_key,
        due_at = excluded.due_at,
        notify_at = excluded.notify_at,
        title = excluded.title,
        body = excluded.body,
        link = excluded.link,
        status = 'pending',
        attempts = 0,
        locked_at = null,
        sent_at = null,
        last_error = null;
    end if;
  end loop;
end;
$$;

create or replace function public.sync_task_notification_jobs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_timezone text;
  task_due_at timestamptz;
begin
  if tg_op = 'DELETE' then
    perform public.cancel_notification_schedule('task', old.id);
    return old;
  end if;

  if new.due_date is null or new.due_time is null or new.status = 'done' or new.is_completed then
    perform public.cancel_notification_schedule('task', new.id);
    return new;
  end if;

  select coalesce(timezone, 'Europe/Moscow') into user_timezone from public.profiles where id = new.user_id;
  task_due_at := (new.due_date + new.due_time) at time zone coalesce(user_timezone, 'Europe/Moscow');
  perform public.enqueue_notification_schedule(
    new.user_id, 'task', new.id, 'taskReminders',
    'Задача: ' || new.title,
    'Срок: ' || to_char(task_due_at at time zone coalesce(user_timezone, 'Europe/Moscow'), 'DD.MM.YYYY HH24:MI'),
    '/tasks', task_due_at
  );
  return new;
end;
$$;

drop trigger if exists tasks_sync_notification_jobs on public.tasks;
create trigger tasks_sync_notification_jobs
  after insert or update of title, due_date, due_time, status, is_completed or delete on public.tasks
  for each row execute function public.sync_task_notification_jobs();

create or replace function public.sync_event_notification_jobs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_timezone text;
  event_due_at timestamptz;
  preference text;
  kind_label text;
begin
  if tg_op = 'DELETE' then
    perform public.cancel_notification_schedule('event', old.id);
    return old;
  end if;

  if new.event_time is null or new.is_completed then
    perform public.cancel_notification_schedule('event', new.id);
    return new;
  end if;

  select coalesce(timezone, 'Europe/Moscow') into user_timezone from public.profiles where id = new.user_id;
  event_due_at := (new.event_date + new.event_time) at time zone coalesce(user_timezone, 'Europe/Moscow');
  preference := case when new.type = 'call' then 'callReminders' else 'meetingReminders' end;
  kind_label := case when new.type = 'call' then 'Звонок' else 'Встреча' end;
  perform public.enqueue_notification_schedule(
    new.user_id, 'event', new.id, preference,
    kind_label || ': ' || new.title,
    'Назначено на ' || to_char(event_due_at at time zone coalesce(user_timezone, 'Europe/Moscow'), 'DD.MM.YYYY HH24:MI'),
    '/calendar', event_due_at
  );
  return new;
end;
$$;

drop trigger if exists events_sync_notification_jobs on public.events;
create trigger events_sync_notification_jobs
  after insert or update of type, title, event_date, event_time, is_completed or delete on public.events
  for each row execute function public.sync_event_notification_jobs();

create or replace function public.sync_activity_notification_jobs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preference text;
  kind_label text;
begin
  if tg_op = 'DELETE' then
    perform public.cancel_notification_schedule('activity', old.id);
    return old;
  end if;

  if new.due_at is null or new.status = 'cancelled' then
    perform public.cancel_notification_schedule('activity', new.id);
    return new;
  end if;

  preference := case when new.type = 'meeting' then 'meetingReminders' when new.type = 'call' then 'callReminders' else 'taskReminders' end;
  kind_label := case when new.type = 'meeting' then 'Встреча' when new.type = 'call' then 'Следующий звонок' else 'Напоминание' end;
  perform public.enqueue_notification_schedule(
    new.user_id, 'activity', new.id, preference,
    kind_label || ': ' || new.title,
    coalesce(new.notes, 'Запланированное действие в LumiCRM'),
    case when new.type = 'call' then '/calls' else '/calendar' end,
    new.due_at
  );
  return new;
end;
$$;

drop trigger if exists activities_sync_notification_jobs on public.crm_activities;
create trigger activities_sync_notification_jobs
  after insert or update of type, title, due_at, status, notes or delete on public.crm_activities
  for each row execute function public.sync_activity_notification_jobs();

create or replace function public.claim_due_notification_jobs(p_limit integer default 100)
returns setof public.notification_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select id
    from public.notification_jobs
    where (
      status = 'pending'
      or (status = 'processing' and locked_at < now() - interval '10 minutes')
    )
      and notify_at <= now()
      and notify_at >= now() - interval '2 hours'
      and attempts < 5
    order by notify_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 100), 250))
  )
  update public.notification_jobs jobs
  set status = 'processing', locked_at = now(), attempts = jobs.attempts + 1
  from candidates
  where jobs.id = candidates.id
  returning jobs.*;
end;
$$;

revoke all on function public.claim_due_notification_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_due_notification_jobs(integer) to service_role;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- Re-fire the new triggers for existing future records.
update public.tasks
set due_time = due_time
where due_date is not null and due_time is not null and status <> 'done' and not is_completed;

update public.events
set event_time = event_time
where event_time is not null and not is_completed;

update public.crm_activities
set due_at = due_at
where due_at is not null and status <> 'cancelled';

commit;

-- Invoke the idempotent dispatcher every minute. The endpoint returns no user data.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'lumicrm-dispatch-reminders' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'lumicrm-dispatch-reminders',
    '* * * * *',
    $cron$select net.http_post(
      url := 'https://flwsglkkarikekkopdbu.supabase.co/functions/v1/dispatch-reminders',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb,
      timeout_milliseconds := 15000
    );$cron$
  );
end $$;
