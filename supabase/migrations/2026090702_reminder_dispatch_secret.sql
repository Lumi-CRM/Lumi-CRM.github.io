-- Apply together with the protected dispatch-reminders function after both
-- DISPATCH_SECRET and Vault secret lumicrm_dispatch_secret are configured.
begin;

create or replace function public.request_lumicrm_reminder_dispatch()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare dispatch_secret text; request_id bigint;
begin
  select decrypted_secret into dispatch_secret from vault.decrypted_secrets
    where name = 'lumicrm_dispatch_secret' limit 1;
  if dispatch_secret is null or length(dispatch_secret) < 32 then
    raise exception 'Reminder dispatcher secret is not configured';
  end if;
  select net.http_post(
    url := 'https://flwsglkkarikekkopdbu.supabase.co/functions/v1/dispatch-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-lumicrm-dispatch-secret', dispatch_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function public.request_lumicrm_reminder_dispatch() from public, anon, authenticated;
grant execute on function public.request_lumicrm_reminder_dispatch() to service_role;

do $$
begin
  if to_regclass('cron.job') is not null then
    -- Supabase blocks direct writes to cron.job. Scheduling a job with the
    -- existing name replaces it through pg_cron's supported permission path.
    perform cron.schedule(
      'lumicrm-dispatch-reminders',
      '* * * * *',
      'select public.request_lumicrm_reminder_dispatch();'
    );
  end if;
end;
$$;

commit;
