-- =============================================================================
-- UPCOM — 005 · Contenus éditoriaux : actualités (articles) et événements
-- -----------------------------------------------------------------------------
--   article_categories 1 ── n articles
--   profiles           1 ── n articles (author_id, auteur interne)
-- =============================================================================

create table public.article_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null default '' check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint article_categories_slug_key unique (slug)
);

create trigger article_categories_ensure_slug
  before insert or update of slug, name on public.article_categories
  for each row execute function private.ensure_slug('name');

create trigger article_categories_set_updated_at
  before update on public.article_categories
  for each row execute function private.set_updated_at();

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.article_categories (id) on delete set null,
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  author_name text check (author_name is null or char_length(author_name) <= 120),
  title text not null check (char_length(title) between 2 and 200),
  slug text not null default '' check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt text check (excerpt is null or char_length(excerpt) <= 500),
  content text,
  cover_image_path text,
  is_featured boolean not null default false,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_slug_key unique (slug),
  constraint articles_published_requires_date
    check (status <> 'published' or published_at is not null)
);

comment on column public.articles.author_id is
  'Auteur interne (profil back-office). Non exposé publiquement.';
comment on column public.articles.author_name is
  'Signature affichée sur le site (ex. « Équipe UPCOM »).';
comment on column public.articles.published_at is
  'Date de publication. Une date future programme la publication.';

create index articles_public_listing_idx on public.articles (status, published_at desc);
create index articles_category_id_idx on public.articles (category_id);
create index articles_author_id_idx on public.articles (author_id);

create trigger articles_ensure_slug
  before insert or update of slug, title on public.articles
  for each row execute function private.ensure_slug('title');

create trigger articles_set_published_at
  before insert or update of status, published_at on public.articles
  for each row execute function private.set_published_at();

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function private.set_updated_at();

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 200),
  slug text not null default '' check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt text check (excerpt is null or char_length(excerpt) <= 500),
  description text,
  location text check (location is null or char_length(location) <= 250),
  event_date timestamptz not null,
  end_date timestamptz,
  cover_image_path text,
  is_featured boolean not null default false,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_slug_key unique (slug),
  constraint events_end_after_start check (end_date is null or end_date >= event_date)
);

create index events_status_date_idx on public.events (status, event_date desc);

create trigger events_ensure_slug
  before insert or update of slug, title on public.events
  for each row execute function private.ensure_slug('title');

create trigger events_set_updated_at
  before update on public.events
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.article_categories enable row level security;
alter table public.articles enable row level security;
alter table public.events enable row level security;

create policy "article_categories_select_all"
  on public.article_categories for select
  to anon, authenticated
  using (true);

create policy "article_categories_insert_managers"
  on public.article_categories for insert
  to authenticated
  with check ((select private.has_permission('articles.manage')));

create policy "article_categories_update_managers"
  on public.article_categories for update
  to authenticated
  using ((select private.has_permission('articles.manage')))
  with check ((select private.has_permission('articles.manage')));

create policy "article_categories_delete_managers"
  on public.article_categories for delete
  to authenticated
  using ((select private.has_permission('articles.manage')));

-- Public : uniquement les articles publiés dont la date est atteinte.
create policy "articles_select_published_or_staff"
  on public.articles for select
  to anon, authenticated
  using (
    (status = 'published' and published_at <= now())
    or (select private.is_staff())
  );

create policy "articles_insert_managers"
  on public.articles for insert
  to authenticated
  with check ((select private.has_permission('articles.manage')));

create policy "articles_update_managers"
  on public.articles for update
  to authenticated
  using ((select private.has_permission('articles.manage')))
  with check ((select private.has_permission('articles.manage')));

create policy "articles_delete_managers"
  on public.articles for delete
  to authenticated
  using ((select private.has_permission('articles.manage')));

create policy "events_select_published_or_staff"
  on public.events for select
  to anon, authenticated
  using (status = 'published' or (select private.is_staff()));

create policy "events_insert_managers"
  on public.events for insert
  to authenticated
  with check ((select private.has_permission('events.manage')));

create policy "events_update_managers"
  on public.events for update
  to authenticated
  using ((select private.has_permission('events.manage')))
  with check ((select private.has_permission('events.manage')));

create policy "events_delete_managers"
  on public.events for delete
  to authenticated
  using ((select private.has_permission('events.manage')));
