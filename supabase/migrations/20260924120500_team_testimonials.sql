-- =============================================================================
-- UPCOM — 006 · Équipe et témoignages
-- -----------------------------------------------------------------------------
-- Note : email / phone / linkedin d'un membre publié sont lisibles par le site
-- public. Ne renseigner que des coordonnées PROFESSIONNELLES destinées à être
-- publiées (jamais de coordonnées personnelles).
-- =============================================================================

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  position text not null check (char_length(position) between 2 and 120),
  biography text check (biography is null or char_length(biography) <= 3000),
  photo_path text,
  email text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone text check (phone is null or phone ~ '^\+?[0-9 ().-]{6,30}$'),
  linkedin_url text check (linkedin_url is null or linkedin_url ~* '^https://([a-z0-9-]+\.)?linkedin\.com/'),
  display_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.team_members.photo_path is
  'Chemin de l''objet dans le bucket Storage "team".';

create index team_members_status_order_idx on public.team_members (status, display_order);

create trigger team_members_set_updated_at
  before update on public.team_members
  for each row execute function private.set_updated_at();

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  company text check (company is null or char_length(company) <= 160),
  role text check (role is null or char_length(role) <= 120),
  content text not null check (char_length(content) between 10 and 2000),
  photo_path text,
  display_order integer not null default 0,
  is_featured boolean not null default false,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.testimonials.role is
  'Fonction de la personne citée (ex. « Directrice marketing »).';
comment on column public.testimonials.photo_path is
  'Chemin de l''objet dans le bucket Storage "testimonials".';

create index testimonials_status_order_idx on public.testimonials (status, display_order);

create trigger testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.team_members enable row level security;
alter table public.testimonials enable row level security;

create policy "team_members_select_published_or_staff"
  on public.team_members for select
  to anon, authenticated
  using (status = 'published' or (select private.is_staff()));

create policy "team_members_insert_managers"
  on public.team_members for insert
  to authenticated
  with check ((select private.has_permission('team.manage')));

create policy "team_members_update_managers"
  on public.team_members for update
  to authenticated
  using ((select private.has_permission('team.manage')))
  with check ((select private.has_permission('team.manage')));

create policy "team_members_delete_managers"
  on public.team_members for delete
  to authenticated
  using ((select private.has_permission('team.manage')));

create policy "testimonials_select_published_or_staff"
  on public.testimonials for select
  to anon, authenticated
  using (status = 'published' or (select private.is_staff()));

create policy "testimonials_insert_managers"
  on public.testimonials for insert
  to authenticated
  with check ((select private.has_permission('testimonials.manage')));

create policy "testimonials_update_managers"
  on public.testimonials for update
  to authenticated
  using ((select private.has_permission('testimonials.manage')))
  with check ((select private.has_permission('testimonials.manage')));

create policy "testimonials_delete_managers"
  on public.testimonials for delete
  to authenticated
  using ((select private.has_permission('testimonials.manage')));
