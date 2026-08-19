-- Cancel scheduled reminders when an entity enters the soft-delete trash.

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

  if new.deleted_at is not null or new.due_date is null or new.due_time is null or new.status = 'done' or new.is_completed then
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
  after insert or update of title, due_date, due_time, status, is_completed, deleted_at or delete on public.tasks
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

  if new.deleted_at is not null or new.event_time is null or new.is_completed then
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
  after insert or update of type, title, event_date, event_time, is_completed, deleted_at or delete on public.events
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

  if new.deleted_at is not null or new.due_at is null or new.status = 'cancelled' then
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
  after insert or update of type, title, due_at, status, notes, deleted_at or delete on public.crm_activities
  for each row execute function public.sync_activity_notification_jobs();
