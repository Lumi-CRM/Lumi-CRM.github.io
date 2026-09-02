-- Durable property price and stage history.

begin;

create table if not exists public.property_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  change_type text not null check (change_type in ('created', 'price', 'status', 'price_status')),
  old_price numeric,
  new_price numeric,
  old_status text,
  new_status text not null,
  source text not null default 'app',
  created_at timestamptz not null default now(),
  check (old_status is null or old_status in ('available', 'reserved', 'sold', 'archived')),
  check (new_status in ('available', 'reserved', 'sold', 'archived'))
);

create index if not exists property_history_user_property_created_idx
  on public.property_history(user_id, property_id, created_at desc);

alter table public.property_history enable row level security;
drop policy if exists "Users manage own property history" on public.property_history;
create policy "Users manage own property history" on public.property_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.property_history to authenticated;

create or replace function public.lumicrm_validate_property_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.properties p where p.id = new.property_id and p.user_id = new.user_id) then
    raise exception 'Property does not belong to this LumiCRM user';
  end if;
  return new;
end;
$$;

drop trigger if exists lumicrm_validate_property_history on public.property_history;
create trigger lumicrm_validate_property_history
  before insert or update on public.property_history
  for each row execute function public.lumicrm_validate_property_history();

insert into public.property_history (
  user_id, property_id, change_type, old_price, new_price, old_status, new_status, source, created_at
)
select p.user_id, p.id, 'created', null, p.price, null, p.status, 'migration', p.created_at
from public.properties p
where not exists (
  select 1 from public.property_history h
  where h.property_id = p.id and h.change_type = 'created'
);

commit;
