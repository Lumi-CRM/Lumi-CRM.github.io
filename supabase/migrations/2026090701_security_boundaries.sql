-- Security boundaries for the multi-tenant CRM. Apply after all existing migrations.
-- No business records are deleted or rewritten by this migration.
begin;

-- Internal SECURITY DEFINER helpers must never be callable through the public API.
revoke all on function public.enqueue_notification_schedule(uuid, text, uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.cancel_notification_schedule(text, uuid) from public, anon, authenticated;
revoke all on function public.claim_due_notification_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_due_notification_jobs(integer) to service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_task_notification_jobs() from public, anon, authenticated;
revoke all on function public.sync_event_notification_jobs() from public, anon, authenticated;
revoke all on function public.sync_activity_notification_jobs() from public, anon, authenticated;

-- The browser may purge its own expired trash. RLS now also applies inside this
-- function; the scheduled database-owner invocation still purges all offices.
alter function public.purge_lumicrm_trash() security invoker;
revoke all on function public.purge_lumicrm_trash() from public, anon;
grant execute on function public.purge_lumicrm_trash() to authenticated, service_role;

-- A simple FK checks existence, not ownership. Validate omitted ownership edges
-- on insert AND update, including requests made with a service-role client.
create or replace function public.lumicrm_validate_tenant_references()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  record_data jsonb := to_jsonb(new);
  reference_id uuid;
  reference_owned boolean;
  argument_index integer := 0;
begin
  while argument_index < tg_nargs loop
    reference_id := nullif(record_data ->> tg_argv[argument_index], '')::uuid;
    if reference_id is not null then
      execute format('select exists (select 1 from public.%I where id = $1 and user_id = $2)', tg_argv[argument_index + 1])
        into reference_owned using reference_id, new.user_id;
      if not reference_owned then
        raise exception using errcode = '23503', message = 'Referenced record does not belong to this office';
      end if;
    end if;
    argument_index := argument_index + 2;
  end loop;
  return new;
end;
$$;
revoke all on function public.lumicrm_validate_tenant_references() from public, anon, authenticated;

create trigger lumicrm_tenant_references before insert or update on public.properties
  for each row execute function public.lumicrm_validate_tenant_references('owner_id', 'clients');
create trigger lumicrm_tenant_references before insert or update on public.deals
  for each row execute function public.lumicrm_validate_tenant_references('property_id', 'properties', 'buyer_id', 'clients');
create trigger lumicrm_tenant_references before insert or update on public.events
  for each row execute function public.lumicrm_validate_tenant_references('related_client_id', 'clients', 'related_property_id', 'properties');
create trigger lumicrm_tenant_references before insert or update on public.tasks
  for each row execute function public.lumicrm_validate_tenant_references('parent_task_id', 'tasks');
create trigger lumicrm_tenant_references before insert or update on public.crm_files
  for each row execute function public.lumicrm_validate_tenant_references('client_id', 'clients', 'property_id', 'properties', 'deal_id', 'deals', 'task_id', 'tasks');
create trigger lumicrm_tenant_references before insert or update on public.crm_activities
  for each row execute function public.lumicrm_validate_tenant_references('client_id', 'clients', 'property_id', 'properties');
create trigger lumicrm_tenant_references before insert or update on public.crm_import_rows
  for each row execute function public.lumicrm_validate_tenant_references('import_id', 'crm_imports');
do $$
begin
  if to_regclass('public.documents') is not null then
    execute 'create trigger lumicrm_tenant_references before insert or update on public.documents
      for each row execute function public.lumicrm_validate_tenant_references(''property_id'', ''properties'', ''client_id'', ''clients'')';
  end if;
end;
$$;
create trigger lumicrm_tenant_references before insert or update on public.property_shares
  for each row execute function public.lumicrm_validate_tenant_references('property_id', 'properties');
create trigger lumicrm_tenant_references before insert or update on public.property_details
  for each row execute function public.lumicrm_validate_tenant_references('property_id', 'properties');
create trigger lumicrm_tenant_references before insert or update on public.client_requirements
  for each row execute function public.lumicrm_validate_tenant_references('client_id', 'clients');
create trigger lumicrm_tenant_references before insert or update on public.property_owners
  for each row execute function public.lumicrm_validate_tenant_references('property_id', 'properties', 'client_id', 'clients');
create trigger lumicrm_tenant_references before insert or update on public.property_history
  for each row execute function public.lumicrm_validate_tenant_references('property_id', 'properties');
create trigger lumicrm_tenant_references before insert or update on public.deal_participants
  for each row execute function public.lumicrm_validate_tenant_references('deal_id', 'deals', 'client_id', 'clients');
create trigger lumicrm_tenant_references before insert or update on public.client_contact_points
  for each row execute function public.lumicrm_validate_tenant_references('client_id', 'clients');
create trigger lumicrm_tenant_references before insert or update on public.client_relationships
  for each row execute function public.lumicrm_validate_tenant_references('source_client_id', 'clients', 'target_client_id', 'clients');

-- Old instructions advertised a public documents bucket. Passport/document
-- downloads must require a signed URL even if that legacy bucket still exists.
update storage.buckets set public = false
where id in ('documents', 'crm-documents', 'crm-images');

-- Public links are capabilities: possession of one random slug authorizes only
-- that listing. A SELECT policy on all active rows made every slug enumerable.
drop policy if exists "Anyone reads active property shares" on public.property_shares;
create policy "Users read own property shares" on public.property_shares
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.property_shares from anon;
grant select, insert, update, delete on public.property_shares to authenticated;

create or replace function public.get_public_property_share(p_slug uuid)
returns table(snapshot jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(
    (select coalesce(jsonb_object_agg(field.key, field.value), '{}'::jsonb)
     from jsonb_each(s.snapshot) field
     where field.key = any(array['address','price','rooms','area','floor','totalFloors',
       'propertyType','description','repair','balcony','elevator','parking','heating','walls']))
    || jsonb_build_object(
      'contact', (select coalesce(jsonb_object_agg(field.key, field.value), '{}'::jsonb)
        from jsonb_each(case when jsonb_typeof(s.snapshot->'contact') = 'object' then s.snapshot->'contact' else '{}'::jsonb end) field
        where field.key = any(array['name','phone','email','position'])),
      'photos', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
          'url', photo->'url', 'name', photo->'name', 'category', photo->'category', 'primary', photo->'primary'))), '[]'::jsonb)
        from jsonb_array_elements(case when jsonb_typeof(s.snapshot->'photos') = 'array' then s.snapshot->'photos' else '[]'::jsonb end) photo
        where jsonb_typeof(photo) = 'object' and photo->>'url' like 'https://%')
    ))
  from public.property_shares s
  join public.properties p on p.id = s.property_id and p.user_id = s.user_id
  where s.slug = p_slug and s.active and p.deleted_at is null
    and jsonb_typeof(s.snapshot) = 'object'
  limit 1;
$$;
revoke all on function public.get_public_property_share(uuid) from public;
grant execute on function public.get_public_property_share(uuid) to anon, authenticated;

-- A per-user atomic rate limit is used by send-push before creating a notification
-- or contacting push services. An RPC caller cannot select another user's bucket.
create table public.push_send_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null check (request_count between 1 and 10)
);
alter table public.push_send_limits enable row level security;
revoke all on public.push_send_limits from public, anon, authenticated;

create function public.claim_push_send(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare claimed integer;
begin
  insert into public.push_send_limits(user_id, window_start, request_count)
  values (p_user_id, date_trunc('minute', now()), 1)
  on conflict (user_id) do update set
    window_start = excluded.window_start,
    request_count = case when push_send_limits.window_start < excluded.window_start then 1 else push_send_limits.request_count + 1 end
  where push_send_limits.window_start < excluded.window_start or push_send_limits.request_count < 10
  returning 1 into claimed;
  return coalesce(claimed = 1, false);
end;
$$;
revoke all on function public.claim_push_send(uuid) from public, anon, authenticated;
grant execute on function public.claim_push_send(uuid) to service_role;

commit;
