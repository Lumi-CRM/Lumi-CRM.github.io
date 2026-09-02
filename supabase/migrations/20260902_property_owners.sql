-- Several people can own one property, including ownership shares.

begin;

create table if not exists public.property_owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  ownership_share numeric(5,2),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, client_id),
  check (ownership_share is null or (ownership_share >= 0 and ownership_share <= 100))
);

create index if not exists property_owners_user_property_idx
  on public.property_owners(user_id, property_id);
create index if not exists property_owners_client_idx
  on public.property_owners(client_id, property_id);
create unique index if not exists property_owners_one_primary_idx
  on public.property_owners(property_id)
  where is_primary;

alter table public.property_owners enable row level security;
drop policy if exists "Users manage own property owners" on public.property_owners;
create policy "Users manage own property owners" on public.property_owners
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.property_owners to authenticated;

create or replace function public.lumicrm_validate_property_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.properties p where p.id = new.property_id and p.user_id = new.user_id) then
    raise exception 'Property does not belong to this LumiCRM user';
  end if;
  if not exists (select 1 from public.clients c where c.id = new.client_id and c.user_id = new.user_id) then
    raise exception 'Owner does not belong to this LumiCRM user';
  end if;
  return new;
end;
$$;

drop trigger if exists lumicrm_validate_property_owner on public.property_owners;
create trigger lumicrm_validate_property_owner
  before insert or update on public.property_owners
  for each row execute function public.lumicrm_validate_property_owner();

drop trigger if exists lumicrm_set_updated_at on public.property_owners;
create trigger lumicrm_set_updated_at
  before update on public.property_owners
  for each row execute function public.lumicrm_set_updated_at();

insert into public.property_owners (user_id, property_id, client_id, is_primary)
select p.user_id, p.id, p.owner_id, true
from public.properties p
where p.owner_id is not null
on conflict (property_id, client_id) do update set is_primary = excluded.is_primary;

commit;
