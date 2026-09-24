-- =============================================================================
-- UPCOM — 009 · Storage
-- -----------------------------------------------------------------------------
-- Un bucket PUBLIC par domaine de contenu : les images du site sont servies
-- par URL publique (CDN), sans policy SELECT pour anon → le listing des
-- fichiers est impossible pour les visiteurs.
--
-- Écriture (upload / remplacement / suppression) : uniquement les membres
-- détenant la permission du domaine correspondant.
--
-- Conséquence assumée d'un bucket public : un fichier uploadé est accessible à
-- quiconque connaît son chemin, même si le contenu associé est en brouillon.
-- Ne jamais y déposer de document confidentiel.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('site-assets',  'site-assets',  true, 5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']),
  ('services',     'services',     true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('projects',     'projects',     true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('team',         'team',         true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('articles',     'articles',     true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('events',       'events',       true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('testimonials', 'testimonials', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Bucket → permission requise pour y écrire.
create or replace function private.can_write_bucket(bucket text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case bucket
    when 'site-assets'  then private.has_permission('settings.manage')
    when 'services'     then private.has_permission('services.manage')
    when 'projects'     then private.has_permission('projects.manage')
    when 'team'         then private.has_permission('team.manage')
    when 'articles'     then private.has_permission('articles.manage')
    when 'events'       then private.has_permission('events.manage')
    when 'testimonials' then private.has_permission('testimonials.manage')
    else false
  end;
$$;

revoke all on function private.can_write_bucket(text) from public;
grant execute on function private.can_write_bucket(text) to authenticated, service_role;

-- Listing / métadonnées : membres du back-office (médiathèque de l'admin).
create policy "upcom_media_select_staff"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('site-assets', 'services', 'projects', 'team', 'articles', 'events', 'testimonials')
    and (select private.is_staff())
  );

create policy "upcom_media_insert_managers"
  on storage.objects for insert
  to authenticated
  with check (private.can_write_bucket(bucket_id));

create policy "upcom_media_update_managers"
  on storage.objects for update
  to authenticated
  using (private.can_write_bucket(bucket_id))
  with check (private.can_write_bucket(bucket_id));

create policy "upcom_media_delete_managers"
  on storage.objects for delete
  to authenticated
  using (private.can_write_bucket(bucket_id));
