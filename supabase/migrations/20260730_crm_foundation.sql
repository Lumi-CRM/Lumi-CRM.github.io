-- LumiCRM cloud foundation
-- Apply after supabase_schema.sql in the Supabase SQL editor.

begin;

alter table public.clients
  add column if not exists lead_temperature text,
  add column if not exists contact_method text,
  add column if not exists next_contact_at timestamptz,
  add column if not exists birth_date date,
  add column if not exists birthday_reminder boolean not null default false,
  add column if not exists contact_comment text,
  add column if not exists roles text[] not null default '{}'::text[],
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'clients_lead_temperature_check'
  ) then
    alter table public.clients
      add constraint clients_lead_temperature_check
      check (lead_temperature is null or lead_temperature in ('cold', 'warm', 'inbound', 'hot'));
  end if;
end $$;

alter table public.properties
  add column if not exists property_type text,
  add column if not exists source_url text,
  add column if not exists listing_type text not null default 'sale',
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'properties_listing_type_check') then
    alter table public.properties add constraint properties_listing_type_check
      check (listing_type in ('sale', 'rent'));
  end if;
end $$;

alter table public.properties drop constraint if exists properties_status_check;
alter table public.properties
  add constraint properties_status_check
  check (status in ('available', 'reserved', 'sold', 'archived'));

alter table public.tasks
  add column if not exists category text,
  add column if not exists project text,
  add column if not exists external_key text,
  add column if not exists completed_at timestamptz;

alter table public.events
  add column if not exists outcome text,
  add column if not exists external_key text;

create unique index if not exists tasks_user_external_key_uidx
  on public.tasks(user_id, external_key)
  where external_key is not null;

create unique index if not exists events_user_external_key_uidx
  on public.events(user_id, external_key)
  where external_key is not null;

create index if not exists clients_user_phone_idx on public.clients(user_id, phone);
create index if not exists clients_user_next_contact_idx on public.clients(user_id, next_contact_at);
create index if not exists properties_user_status_idx on public.properties(user_id, status);
create index if not exists tasks_user_due_date_idx on public.tasks(user_id, due_date);
create index if not exists events_user_event_date_idx on public.events(user_id, event_date);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  type text not null check (type in ('call', 'message', 'meeting', 'note', 'follow_up')),
  status text not null default 'completed' check (status in ('planned', 'completed', 'cancelled')),
  title text not null,
  occurred_at timestamptz,
  due_at timestamptz,
  outcome text,
  notes text,
  source text,
  external_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists crm_activities_user_external_key_uidx
  on public.crm_activities(user_id, external_key)
  where external_key is not null;
create index if not exists crm_activities_user_due_idx on public.crm_activities(user_id, due_at);
create index if not exists crm_activities_client_idx on public.crm_activities(client_id, occurred_at desc);

create table if not exists public.crm_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null default 'google_sheets',
  source_document_id text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  imported_rows integer not null default 0,
  skipped_rows integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.crm_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.crm_imports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_document_id text not null,
  sheet_name text not null,
  source_row_number integer not null,
  fingerprint text not null,
  entity_type text,
  entity_id uuid,
  raw_data jsonb not null,
  imported_at timestamptz not null default now(),
  unique(user_id, fingerprint)
);

create table if not exists public.crm_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  bucket text not null check (bucket in ('crm-documents', 'crm-images')),
  storage_path text not null,
  name text not null,
  mime_type text,
  size_bytes bigint,
  category text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, bucket, storage_path)
);

create table if not exists public.property_details (
  property_id uuid primary key references public.properties(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sale_type text default 'direct',
  first_sale boolean,
  auction_sale boolean,
  mortgage_allowed boolean,
  owner_pays_commission boolean,
  shared_commission boolean,
  online_showing boolean,
  apartment_type text default 'standard',
  ownership_share numeric default 100,
  apartment_levels integer default 1,
  garbage_chute boolean,
  price_usd numeric,
  auto_convert_currency boolean,
  negotiable boolean,
  liquidity text,
  market_price numeric,
  room_areas text,
  living_area numeric,
  kitchen_area numeric,
  hallway_area numeric,
  ceiling_height numeric,
  balcony_type text,
  bathroom_type text,
  window_view text,
  gas text,
  furniture text,
  cadastral_number text,
  egrn_delivery_method text,
  ad_title varchar(33),
  region text default 'Курская обл.',
  region_district text,
  locality text,
  street text,
  house_number text,
  building_block text,
  letter text,
  structure_number text,
  apartment_number text,
  advertising_address text,
  complex_name text,
  distance_from_city numeric,
  latitude numeric,
  longitude numeric,
  developer text,
  residential_complex text,
  house_type text,
  house_series text,
  new_building boolean,
  renovation_year integer,
  service_contract text,
  ownership_type text,
  private_notes text,
  public_notes text,
  linked_cards jsonb not null default '{}'::jsonb,
  publication_settings jsonb not null default '{}'::jsonb,
  service_fields jsonb not null default '{}'::jsonb,
  rental_terms jsonb not null default '{}'::jsonb,
  rental_deal_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists property_details_user_cadastral_uidx
  on public.property_details(user_id, cadastral_number)
  where cadastral_number is not null and cadastral_number <> '';

create table if not exists public.client_requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  purpose text not null default 'sale' check (purpose in ('sale', 'rent')),
  request_type text,
  property_type text default 'Квартира',
  considers_new_build boolean,
  price_min numeric,
  price_max numeric,
  total_area_min numeric,
  total_area_max numeric,
  living_area_min numeric,
  living_area_max numeric,
  kitchen_area_min numeric,
  kitchen_area_max numeric,
  rooms integer[],
  floor_min integer,
  floor_max integer,
  locations jsonb not null default '[]'::jsonb,
  map_areas jsonb not null default '[]'::jsonb,
  deal_terms jsonb not null default '{}'::jsonb,
  object_criteria jsonb not null default '{}'::jsonb,
  building_criteria jsonb not null default '{}'::jsonb,
  service_fields jsonb not null default '{}'::jsonb,
  linked_cards jsonb not null default '{}'::jsonb,
  private_notes text,
  public_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, purpose)
);

alter table public.crm_activities enable row level security;
alter table public.crm_imports enable row level security;
alter table public.crm_import_rows enable row level security;
alter table public.crm_files enable row level security;
alter table public.property_details enable row level security;
alter table public.client_requirements enable row level security;

drop policy if exists "Users manage own CRM activities" on public.crm_activities;
create policy "Users manage own CRM activities" on public.crm_activities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own CRM imports" on public.crm_imports;
create policy "Users manage own CRM imports" on public.crm_imports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own CRM import rows" on public.crm_import_rows;
create policy "Users manage own CRM import rows" on public.crm_import_rows
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own CRM files" on public.crm_files;
create policy "Users manage own CRM files" on public.crm_files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own property details" on public.property_details;
create policy "Users manage own property details" on public.property_details
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own client requirements" on public.client_requirements;
create policy "Users manage own client requirements" on public.client_requirements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values
  ('crm-documents', 'crm-documents', false),
  ('crm-images', 'crm-images', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Users read own CRM storage" on storage.objects;
create policy "Users read own CRM storage" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('crm-documents', 'crm-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users upload own CRM storage" on storage.objects;
create policy "Users upload own CRM storage" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('crm-documents', 'crm-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own CRM storage" on storage.objects;
create policy "Users update own CRM storage" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('crm-documents', 'crm-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('crm-documents', 'crm-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own CRM storage" on storage.objects;
create policy "Users delete own CRM storage" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('crm-documents', 'crm-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
