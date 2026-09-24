-- =============================================================================
-- UPCOM — 004 · Réalisations (portfolio)
-- -----------------------------------------------------------------------------
--   service_categories 1 ── n projects      (catégorie optionnelle)
--   projects           1 ── n project_images (galerie, suppression en cascade)
-- =============================================================================

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.service_categories (id) on delete set null,
  title text not null check (char_length(title) between 2 and 160),
  slug text not null default '' check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt text check (excerpt is null or char_length(excerpt) <= 500),
  description text,
  client_name text check (client_name is null or char_length(client_name) <= 160),
  year smallint check (year is null or year between 1990 and 2100),
  cover_image_path text,
  display_order integer not null default 0,
  is_featured boolean not null default false,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_slug_key unique (slug)
);

comment on column public.projects.cover_image_path is
  'Chemin de l''objet dans le bucket Storage "projects".';

create index projects_category_id_idx on public.projects (category_id);
create index projects_status_order_idx on public.projects (status, display_order);
create index projects_featured_idx on public.projects (display_order)
  where is_featured and status = 'published';

create trigger projects_ensure_slug
  before insert or update of slug, title on public.projects
  for each row execute function private.ensure_slug('title');

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function private.set_updated_at();

create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  image_path text not null,
  alt_text text check (alt_text is null or char_length(alt_text) <= 250),
  caption text check (caption is null or char_length(caption) <= 500),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_images_project_path_key unique (project_id, image_path)
);

comment on column public.project_images.image_path is
  'Chemin de l''objet dans le bucket Storage "projects".';

create index project_images_project_order_idx
  on public.project_images (project_id, display_order);

create trigger project_images_set_updated_at
  before update on public.project_images
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.project_images enable row level security;

create policy "projects_select_published_or_staff"
  on public.projects for select
  to anon, authenticated
  using (status = 'published' or (select private.is_staff()));

create policy "projects_insert_managers"
  on public.projects for insert
  to authenticated
  with check ((select private.has_permission('projects.manage')));

create policy "projects_update_managers"
  on public.projects for update
  to authenticated
  using ((select private.has_permission('projects.manage')))
  with check ((select private.has_permission('projects.manage')));

create policy "projects_delete_managers"
  on public.projects for delete
  to authenticated
  using ((select private.has_permission('projects.manage')));

-- Une image est publique si et seulement si son projet est publié.
create policy "project_images_select_published_or_staff"
  on public.project_images for select
  to anon, authenticated
  using (
    (select private.is_staff())
    or exists (
      select 1 from public.projects p
      where p.id = project_images.project_id
        and p.status = 'published'
    )
  );

create policy "project_images_insert_managers"
  on public.project_images for insert
  to authenticated
  with check ((select private.has_permission('projects.manage')));

create policy "project_images_update_managers"
  on public.project_images for update
  to authenticated
  using ((select private.has_permission('projects.manage')))
  with check ((select private.has_permission('projects.manage')));

create policy "project_images_delete_managers"
  on public.project_images for delete
  to authenticated
  using ((select private.has_permission('projects.manage')));
