-- PostgREST can target a normal unique index for upserts. PostgreSQL still
-- allows multiple NULL values, so the partial predicate is unnecessary.
begin;

drop index if exists public.notifications_reminder_job_uidx;
create unique index notifications_reminder_job_uidx
  on public.notifications(reminder_job_id);

update public.notification_jobs
set status = 'pending', attempts = 0, locked_at = null, last_error = null
where status = 'failed'
  and notify_at >= now() - interval '2 hours';

commit;
