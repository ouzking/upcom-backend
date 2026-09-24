-- =============================================================================
-- UPCOM — 003 · Catalogue : catégories de services et services
-- -----------------------------------------------------------------------------
--   service_categories 1 ── n services
--   service_categories 1 ── n projects (voir 004)
-- =============================================================================

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null default '' check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (description is null or char_length(description) <= 2000),
  icon text check (icon is null or char_length(icon) <= 100),
  display_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_categories_slug_key unique (slug)
);

comment on table public.service_categories is
  'Grands pôles d''activité UPCOM (cahier des charges).';
comment on column public.service_categories.icon is
  'Identifiant d''icône côté front (ex. nom Lucide) — pas un fichier.';

create index service_categories_status_order_idx
  on public.service_categories (status, display_order);

create trigger service_categories_ensure_slug
  before insert or update of slug, name on public.service_categories
  for each row execute function private.ensure_slug('name');

create trigger service_categories_set_updated_at
  before update on public.service_categories
  for each row execute function private.set_updated_at();

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories (id) on delete restrict,
  title text not null check (char_length(title) between 2 and 160),
  slug text not null default '' check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text check (short_description is null or char_length(short_description) <= 500),
  description text,
  image_path text,
  icon text check (icon is null or char_length(icon) <= 100),
  display_order integer not null default 0,
  is_featured boolean not null default false,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_slug_key unique (slug)
);

comment on column public.services.image_path is
  'Chemin de l''objet dans le bucket Storage "services" (pas une URL complète).';

create index services_category_id_idx on public.services (category_id);
create index services_status_order_idx on public.services (status, display_order);
create index services_featured_idx on public.services (display_order)
  where is_featured and status = 'published';

create trigger services_ensure_slug
  before insert or update of slug, title on public.services
  for each row execute function private.ensure_slug('title');

create trigger services_set_updated_at
  before update on public.services
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.service_categories enable row level security;
alter table public.services enable row level security;

create policy "service_categories_select_published_or_staff"
  on public.service_categories for select
  to anon, authenticated
  using (status = 'published' or (select private.is_staff()));

create policy "service_categories_insert_managers"
  on public.service_categories for insert
  to authenticated
  with check ((select private.has_permission('services.manage')));

create policy "service_categories_update_managers"
  on public.service_categories for update
  to authenticated
  using ((select private.has_permission('services.manage')))
  with check ((select private.has_permission('services.manage')));

create policy "service_categories_delete_managers"
  on public.service_categories for delete
  to authenticated
  using ((select private.has_permission('services.manage')));

create policy "services_select_published_or_staff"
  on public.services for select
  to anon, authenticated
  using (status = 'published' or (select private.is_staff()));

create policy "services_insert_managers"
  on public.services for insert
  to authenticated
  with check ((select private.has_permission('services.manage')));

create policy "services_update_managers"
  on public.services for update
  to authenticated
  using ((select private.has_permission('services.manage')))
  with check ((select private.has_permission('services.manage')));

create policy "services_delete_managers"
  on public.services for delete
  to authenticated
  using ((select private.has_permission('services.manage')));

-- -----------------------------------------------------------------------------
-- Données de référence : les 6 pôles du cahier des charges.
-- Descriptions et icônes volontairement vides : à compléter par UPCOM.
-- -----------------------------------------------------------------------------
insert into public.service_categories (name, slug, display_order, status) values
  ('Communication stratégique',              'communication-strategique',  10, 'published'),
  ('Communication digitale',                 'communication-digitale',     20, 'published'),
  ('Identité visuelle & création graphique', 'identite-visuelle-creation-graphique', 30, 'published'),
  ('Production audiovisuelle',               'production-audiovisuelle',   40, 'published'),
  ('Événementiel',                           'evenementiel',               50, 'published'),
  ('Services aux entreprises',               'services-aux-entreprises',   60, 'published')
on conflict (slug) do nothing;
