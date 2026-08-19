-- Multiple buyers and owners can participate in a single LumiCRM deal.

begin;

create table if not exists public.deal_participants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  role text not null check (role in ('buyer', 'owner')),
  created_at timestamptz not null default now(),
  unique(deal_id, client_id, role)
);

create index if not exists deal_participants_user_deal_idx
  on public.deal_participants(user_id, deal_id);
create index if not exists deal_participants_client_idx
  on public.deal_participants(client_id, role);

alter table public.deal_participants enable row level security;
drop policy if exists "Users manage own deal participants" on public.deal_participants;
create policy "Users manage own deal participants" on public.deal_participants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.deal_participants to authenticated;

create or replace function public.lumicrm_validate_deal_participant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.deals d where d.id = new.deal_id and d.user_id = new.user_id) then
    raise exception 'Deal does not belong to this LumiCRM user';
  end if;
  if not exists (select 1 from public.clients c where c.id = new.client_id and c.user_id = new.user_id) then
    raise exception 'Participant does not belong to this LumiCRM user';
  end if;
  return new;
end;
$$;

drop trigger if exists lumicrm_validate_deal_participant on public.deal_participants;
create trigger lumicrm_validate_deal_participant
  before insert or update on public.deal_participants
  for each row execute function public.lumicrm_validate_deal_participant();

insert into public.deal_participants (user_id, deal_id, client_id, role)
select d.user_id, d.id, d.buyer_id, 'buyer'
from public.deals d
where d.buyer_id is not null
on conflict (deal_id, client_id, role) do nothing;

insert into public.deal_participants (user_id, deal_id, client_id, role)
select d.user_id, d.id, p.owner_id, 'owner'
from public.deals d
join public.properties p on p.id = d.property_id and p.user_id = d.user_id
where p.owner_id is not null
on conflict (deal_id, client_id, role) do nothing;

commit;
