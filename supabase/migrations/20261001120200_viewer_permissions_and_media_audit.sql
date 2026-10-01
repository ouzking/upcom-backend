-- =============================================================================
-- UPCOM — 013 · Permissions de l'observateur + audit des médias orphelins
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Rôle viewer, étape 2/2 : consultation des demandes, aucune écriture.
-- -----------------------------------------------------------------------------
insert into public.role_permissions (role, permission) values
  ('viewer', 'quotes.view'),
  ('viewer', 'contacts.view')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Médias orphelins : fichiers des buckets de contenu qui ne sont plus
-- référencés par aucune ligne (contenu supprimé, image remplacée…).
--
-- * Un fichier est considéré comme utilisé s'il est référencé par une colonne
--   *_path OU cité dans un texte (contenu d'article, descriptions), ce qui
--   protège les images insérées dans le corps d'un article.
-- * Les fichiers récents (< min_age) sont ignorés : un upload peut précéder
--   l'enregistrement du formulaire.
-- * site-assets est exclu (logos, images de partage gérées à la main).
--
-- Réservée à la service_role : appelée par l'Edge Function cleanup-media, qui
-- contrôle les droits de l'appelant puis supprime via l'API Storage (une
-- suppression SQL directe laisserait les fichiers physiques en place).
-- -----------------------------------------------------------------------------
create or replace function public.list_orphan_media(min_age interval default interval '24 hours')
returns table (bucket_id text, name text, size_bytes bigint, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with referenced (bucket_id, name) as (
    select 'services', image_path from public.services where image_path is not null
    union all select 'projects', cover_image_path from public.projects where cover_image_path is not null
    union all select 'projects', image_path from public.project_images
    union all select 'articles', cover_image_path from public.articles where cover_image_path is not null
    union all select 'events', cover_image_path from public.events where cover_image_path is not null
    union all select 'team', photo_path from public.team_members where photo_path is not null
    union all select 'testimonials', photo_path from public.testimonials where photo_path is not null
  ),
  texts (body) as (
    select content from public.articles where content is not null
    union all select description from public.services where description is not null
    union all select description from public.projects where description is not null
    union all select description from public.events where description is not null
  )
  select o.bucket_id, o.name, nullif(o.metadata ->> 'size', '')::bigint, o.created_at
  from storage.objects o
  where o.bucket_id in ('services', 'projects', 'team', 'articles', 'events', 'testimonials')
    and o.created_at < now() - min_age
    and o.name not like '%.emptyFolderPlaceholder'
    and not exists (
      select 1 from referenced r where r.bucket_id = o.bucket_id and r.name = o.name
    )
    and not exists (
      select 1 from texts t where strpos(t.body, o.name) > 0
    )
  order by o.bucket_id, o.created_at;
$$;

revoke all on function public.list_orphan_media(interval) from public, anon, authenticated;
grant execute on function public.list_orphan_media(interval) to service_role;
