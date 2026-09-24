-- =============================================================================
-- UPCOM — 008 · Paramètres du site et réseaux sociaux
-- -----------------------------------------------------------------------------
-- site_settings est une table singleton (une seule ligne, id = 1) : colonnes
-- typées plutôt qu'un clé/valeur, pour des types TypeScript précis.
-- =============================================================================

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  company_name text not null check (char_length(company_name) between 2 and 160),
  tagline text check (tagline is null or char_length(tagline) <= 250),
  description text check (description is null or char_length(description) <= 2000),
  address text check (address is null or char_length(address) <= 300),
  phone_primary text check (phone_primary is null or phone_primary ~ '^\+?[0-9 ().-]{6,30}$'),
  phone_secondary text check (phone_secondary is null or phone_secondary ~ '^\+?[0-9 ().-]{6,30}$'),
  email text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  whatsapp_number text check (whatsapp_number is null or whatsapp_number ~ '^\+?[0-9 ().-]{6,30}$'),
  map_url text check (map_url is null or map_url ~* '^https://'),
  opening_hours text check (opening_hours is null or char_length(opening_hours) <= 500),
  logo_path text,
  favicon_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.site_settings is
  'Informations globales du site (singleton id = 1). Chemins d''images : bucket "site-assets".';

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function private.set_updated_at();

-- Informations officielles fournies par UPCOM. Les champs inconnus restent NULL.
insert into public.site_settings (id, company_name, address, phone_primary, phone_secondary)
values (
  1,
  'UPCOM AGENCY & SERVICES',
  'Ouest Foire, Cité Air Afrique, Lot 13',
  '77 402 74 94',
  '77 835 92 94'
)
on conflict (id) do nothing;

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform public.social_platform not null,
  label text check (label is null or char_length(label) <= 80),
  url text not null check (char_length(url) <= 500 and url ~* '^https://'),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_links_platform_url_key unique (platform, url)
);

create index social_links_active_order_idx on public.social_links (is_active, display_order);

create trigger social_links_set_updated_at
  before update on public.social_links
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.site_settings enable row level security;
alter table public.social_links enable row level security;

create policy "site_settings_select_all"
  on public.site_settings for select
  to anon, authenticated
  using (true);

-- Pas d'INSERT / DELETE : la ligne unique est créée par cette migration.
create policy "site_settings_update_managers"
  on public.site_settings for update
  to authenticated
  using ((select private.has_permission('settings.manage')))
  with check ((select private.has_permission('settings.manage')));

create policy "social_links_select_active_or_staff"
  on public.social_links for select
  to anon, authenticated
  using (is_active or (select private.is_staff()));

create policy "social_links_insert_managers"
  on public.social_links for insert
  to authenticated
  with check ((select private.has_permission('settings.manage')));

create policy "social_links_update_managers"
  on public.social_links for update
  to authenticated
  using ((select private.has_permission('settings.manage')))
  with check ((select private.has_permission('settings.manage')));

create policy "social_links_delete_managers"
  on public.social_links for delete
  to authenticated
  using ((select private.has_permission('settings.manage')));
