-- Tests RLS : ce qu'un visiteur anonyme (site public) peut et ne peut pas faire.
-- Exécution : supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Jeu de données indépendant du seed
insert into public.services (category_id, title, slug, status)
select id, 'Test publié', 'test-publie', 'published' from public.service_categories limit 1;
insert into public.services (category_id, title, slug, status)
select id, 'Test brouillon', 'test-brouillon', 'draft' from public.service_categories limit 1;
insert into public.articles (title, slug, status, published_at) values
  ('Test futur', 'test-futur', 'published', now() + interval '1 day');
insert into public.quote_requests (name, email, message) values
  ('Test', 'test@example.com', 'Message de test suffisamment long');

set local role anon;

select is(
  (select count(*)::int from public.services where status <> 'published'),
  0, 'anon ne voit aucun service non publié');
select is(
  (select count(*)::int from public.services where slug = 'test-publie'),
  1, 'anon voit les services publiés');
select is(
  (select count(*)::int from public.articles where slug = 'test-futur'),
  0, 'anon ne voit pas un article programmé dans le futur');
select is(
  (select company_name from public.site_settings),
  'UPCOM AGENCY & SERVICES', 'anon lit les paramètres du site');
select is(
  (select count(*)::int from public.profiles),
  0, 'anon ne voit aucun profil');

select throws_ok(
  $$ select * from public.quote_requests $$,
  '42501', null, 'anon ne peut pas lire les demandes de devis');
select throws_ok(
  $$ select * from public.contact_messages $$,
  '42501', null, 'anon ne peut pas lire les messages de contact');
select throws_ok(
  $$ insert into public.quote_requests (name, email, message) values ('X', 'x@example.com', 'Message direct interdit') $$,
  '42501', null, 'anon ne peut pas insérer directement une demande');
select throws_ok(
  $$ insert into public.contact_messages (name, email, message) values ('X', 'x@example.com', 'Message direct interdit') $$,
  '42501', null, 'anon ne peut pas insérer directement un message');
select throws_ok(
  $$ update public.services set title = 'piraté' $$,
  '42501', null, 'anon ne peut pas modifier un service');
select throws_ok(
  $$ delete from public.projects $$,
  '42501', null, 'anon ne peut pas supprimer un projet');
select throws_ok(
  $$ update public.site_settings set company_name = 'piraté' $$,
  '42501', null, 'anon ne peut pas modifier les paramètres');
select throws_ok(
  $$ select * from public.get_my_access() $$,
  '42501', null, 'anon ne peut pas appeler get_my_access');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('services', 'pirate.png') $$,
  '42501', null, 'anon ne peut pas uploader de fichier');

select * from finish();
rollback;
