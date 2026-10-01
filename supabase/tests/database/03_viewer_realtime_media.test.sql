-- Tests : rôle observateur (lecture seule), temps réel des demandes, audit des médias.
-- Exécution : supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555555', 'viewer@test.local');
update public.profiles set role = 'viewer' where id = '55555555-5555-5555-5555-555555555555';

insert into public.quote_requests (name, email, message) values
  ('Prospect', 'prospect-viewer@example.com', 'Message de test suffisamment long');
insert into public.services (category_id, title, slug, status, image_path)
select id, 'Service avec image', 'service-avec-image', 'draft', 'services/test/utilisee.webp'
from public.service_categories limit 1;

-- Fichiers : un utilisé, un cité dans un article, un orphelin ancien, un orphelin récent
insert into storage.objects (bucket_id, name, created_at) values
  ('services', 'services/test/utilisee.webp', now() - interval '3 days'),
  ('articles', 'articles/test/dans-le-texte.webp', now() - interval '3 days'),
  ('projects', 'projects/test/orpheline.webp', now() - interval '3 days'),
  ('projects', 'projects/test/recente.webp', now());
insert into public.articles (title, slug, status, content)
values ('Article test', 'article-test-media', 'draft', '![image](articles/test/dans-le-texte.webp)');

-- ---------------------------------------------------------------- temps réel
select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'quote_requests'),
  'quote_requests est publié en temps réel');
select ok(
  exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'contact_messages'),
  'contact_messages est publié en temps réel');

-- ---------------------------------------------------------------- audit médias (service_role)
select results_eq(
  $$ select bucket_id || '/' || name from public.list_orphan_media() $$,
  $$ values ('projects/projects/test/orpheline.webp') $$,
  'seule l''image ancienne et non référencée est orpheline');

-- ---------------------------------------------------------------- observateur
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);

select results_eq(
  $$ select permissions from public.get_my_access() $$,
  $$ values ('{quotes.view,contacts.view}'::public.app_permission[]) $$,
  'observateur : consultation des demandes uniquement');
select is(
  (select count(*)::int from public.quote_requests where email = 'prospect-viewer@example.com'),
  1, 'observateur voit les demandes de devis');
select is(
  (select count(*)::int from public.services where slug = 'service-avec-image'),
  1, 'observateur voit les brouillons');
-- La RLS filtre silencieusement les lignes : aucune erreur, mais rien n'est modifié.
update public.quote_requests set status = 'closed' where email = 'prospect-viewer@example.com';
select is(
  (select status::text from public.quote_requests where email = 'prospect-viewer@example.com'),
  'new', 'observateur ne peut pas traiter une demande');
update public.services set title = 'Modifié' where slug = 'service-avec-image';
select is(
  (select title from public.services where slug = 'service-avec-image'),
  'Service avec image', 'observateur ne peut pas modifier un contenu');
select throws_ok(
  $$ insert into public.articles (title) values ('Interdit') $$,
  '42501', null, 'observateur ne peut pas créer de contenu');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('projects', 'pirate.webp') $$,
  '42501', null, 'observateur ne peut pas uploader');
select throws_ok(
  $$ select * from public.list_orphan_media() $$,
  '42501', null, 'l''audit des médias est réservé au serveur');
select throws_ok(
  $$ update public.profiles set role = 'super_admin' where id = '55555555-5555-5555-5555-555555555555' $$,
  '42501', null, 'observateur ne peut pas changer son rôle');

select * from finish();
rollback;
