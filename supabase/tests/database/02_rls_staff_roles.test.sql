-- Tests RLS : permissions des rôles du back-office et garde-fous sur les profils.
-- Exécution : supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Utilisateurs de test (le trigger crée les profils SANS rôle)
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'super@test.local',      '{"full_name":"Super"}'),
  ('22222222-2222-2222-2222-222222222222', 'editor@test.local',     '{"full_name":"Editor","role":"super_admin"}'),
  ('33333333-3333-3333-3333-333333333333', 'commercial@test.local', '{}'),
  ('44444444-4444-4444-4444-444444444444', 'norole@test.local',     '{}');

select is(
  (select role from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  null, 'le rôle n''est jamais lu depuis les métadonnées utilisateur');

update public.profiles set role = 'super_admin' where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set role = 'editor'      where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set role = 'commercial'  where id = '33333333-3333-3333-3333-333333333333';

insert into public.quote_requests (name, email, message) values
  ('Prospect', 'prospect@example.com', 'Message de test suffisamment long');

-- ---------------------------------------------------------------- editor
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select lives_ok(
  $$ insert into public.services (category_id, title, status)
     select id, 'Été Spécial', 'draft' from public.service_categories limit 1 $$,
  'editor crée un service');
select is(
  (select slug from public.services where title = 'Été Spécial'),
  'ete-special', 'le slug est généré automatiquement');
select is(
  (select count(*)::int from public.services where status = 'draft' and title = 'Été Spécial'),
  1, 'editor voit les brouillons');
select is(
  (select count(*)::int from public.quote_requests),
  0, 'editor ne voit pas les demandes de devis');
select throws_ok(
  $$ update public.profiles set role = 'super_admin' where id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, 'editor ne peut pas s''auto-promouvoir');
select lives_ok(
  $$ update public.profiles set full_name = 'Nouveau nom' where id = '22222222-2222-2222-2222-222222222222' $$,
  'editor modifie son nom');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('site-assets', 'logo.png') $$,
  '42501', null, 'editor ne peut pas écrire dans site-assets');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('services', 'image.png') $$,
  'editor écrit dans le bucket services');

-- ---------------------------------------------------------------- commercial
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.quote_requests where email = 'prospect@example.com'),
  1, 'commercial voit les demandes de devis');
select lives_ok(
  $$ update public.quote_requests set status = 'in_progress', internal_notes = 'Rappelé' $$,
  'commercial met à jour le suivi');
select throws_ok(
  $$ update public.quote_requests set message = 'Contenu altéré par le commercial' $$,
  '42501', null, 'le contenu soumis par le prospect est immuable');
select throws_ok(
  $$ insert into public.projects (title) values ('Projet interdit') $$,
  '42501', null, 'commercial ne peut pas créer de réalisation');
select results_eq(
  $$ select permissions from public.get_my_access() $$,
  $$ values ('{quotes.view,quotes.manage,contacts.view,contacts.manage}'::public.app_permission[]) $$,
  'get_my_access renvoie les permissions du commercial');

-- ---------------------------------------------------------------- sans rôle
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);

select is(
  (select count(*)::int from public.services where status <> 'published'),
  0, 'un compte sans rôle a les droits d''un visiteur');
select is(
  (select count(*)::int from public.profiles),
  1, 'un compte sans rôle ne voit que son profil');

-- ---------------------------------------------------------------- super_admin
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok(
  $$ update public.profiles set role = 'communication_manager' where id = '22222222-2222-2222-2222-222222222222' $$,
  'super_admin change un rôle');
select throws_ok(
  $$ update public.profiles set role = 'editor' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'le dernier super_admin ne peut pas être rétrogradé');
select throws_ok(
  $$ update public.profiles set email = 'autre@test.local' where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501', null, 'l''email du profil n''est pas modifiable via l''API');

select * from finish();
rollback;
