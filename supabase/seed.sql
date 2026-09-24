-- =============================================================================
-- UPCOM — Seed de DÉMONSTRATION (environnement local uniquement)
-- -----------------------------------------------------------------------------
-- Exécuté automatiquement par `supabase db reset` / `supabase start`.
-- NE PAS exécuter en production.
--
-- Toutes les données ci-dessous sont FICTIVES et préfixées « [DEMO] ».
-- Aucun service, client, réalisation, chiffre ou témoignage réel d'UPCOM.
--
-- Les données officielles (6 catégories de services, coordonnées de
-- l'entreprise) sont déjà insérées par les migrations.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Services (1 exemple par catégorie officielle)
-- -----------------------------------------------------------------------------
insert into public.services (category_id, title, slug, short_description, description, display_order, is_featured, status)
select
  c.id,
  '[DEMO] Service exemple — ' || c.name,
  'demo-' || c.slug,
  '[DEMO] Description courte de démonstration. À remplacer par le contenu officiel UPCOM.',
  '[DEMO] Description complète de démonstration. Ce texte est un PLACEHOLDER.',
  c.display_order,
  c.display_order <= 30,
  'published'
from public.service_categories c;

insert into public.services (category_id, title, slug, short_description, status)
select c.id, '[DEMO] Service en brouillon', 'demo-service-brouillon',
  '[DEMO] Ce service est en brouillon : invisible sur le site public.', 'draft'
from public.service_categories c
where c.slug = 'communication-digitale';

-- -----------------------------------------------------------------------------
-- Réalisations
-- -----------------------------------------------------------------------------
insert into public.projects (category_id, title, slug, excerpt, description, client_name, year, display_order, is_featured, status)
select c.id, v.title, v.slug, v.excerpt, v.description, v.client_name, v.year, v.display_order, v.is_featured, v.status::public.content_status
from (values
  ('production-audiovisuelle', '[DEMO] Réalisation exemple A', 'demo-realisation-a',
    '[DEMO] Résumé de démonstration.', '[DEMO] Description PLACEHOLDER.', '[DEMO] Client exemple A', 2025, 10, true, 'published'),
  ('identite-visuelle-creation-graphique', '[DEMO] Réalisation exemple B', 'demo-realisation-b',
    '[DEMO] Résumé de démonstration.', '[DEMO] Description PLACEHOLDER.', '[DEMO] Client exemple B', 2024, 20, false, 'published'),
  ('evenementiel', '[DEMO] Réalisation en brouillon', 'demo-realisation-brouillon',
    '[DEMO] Invisible publiquement.', null, null, null, 30, false, 'draft')
) as v(category_slug, title, slug, excerpt, description, client_name, year, display_order, is_featured, status)
join public.service_categories c on c.slug = v.category_slug;

insert into public.project_images (project_id, image_path, alt_text, display_order)
select p.id, 'demo/' || p.slug || '/image-' || n || '.webp', '[DEMO] Image ' || n, n
from public.projects p
cross join generate_series(1, 2) as n
where p.slug in ('demo-realisation-a', 'demo-realisation-b');

-- -----------------------------------------------------------------------------
-- Actualités
-- -----------------------------------------------------------------------------
insert into public.article_categories (name, slug, display_order) values
  ('[DEMO] Actualités', 'demo-actualites', 10);

insert into public.articles (category_id, author_id, author_name, title, slug, excerpt, content, is_featured, status, published_at)
select c.id, null, '[DEMO] Équipe UPCOM', v.title, v.slug, v.excerpt, v.content, v.is_featured, v.status::public.content_status, v.published_at
from (values
  ('[DEMO] Article publié', 'demo-article-publie', '[DEMO] Extrait de démonstration.',
    '[DEMO] Contenu PLACEHOLDER de l''article.', true, 'published', now() - interval '2 days'),
  ('[DEMO] Article programmé', 'demo-article-programme', '[DEMO] Publication future : invisible publiquement.',
    '[DEMO] Contenu PLACEHOLDER.', false, 'published', now() + interval '7 days'),
  ('[DEMO] Article brouillon', 'demo-article-brouillon', '[DEMO] Brouillon.',
    '[DEMO] Contenu PLACEHOLDER.', false, 'draft', null)
) as v(title, slug, excerpt, content, is_featured, status, published_at)
cross join public.article_categories c
where c.slug = 'demo-actualites';

-- -----------------------------------------------------------------------------
-- Événements
-- -----------------------------------------------------------------------------
insert into public.events (title, slug, excerpt, description, location, event_date, end_date, is_featured, status) values
  ('[DEMO] Événement à venir', 'demo-evenement-a-venir', '[DEMO] Extrait.', '[DEMO] Description PLACEHOLDER.',
    '[DEMO] Lieu à définir', now() + interval '30 days', now() + interval '30 days 4 hours', true, 'published'),
  ('[DEMO] Événement passé', 'demo-evenement-passe', '[DEMO] Extrait.', '[DEMO] Description PLACEHOLDER.',
    '[DEMO] Lieu à définir', now() - interval '60 days', null, false, 'published');

-- -----------------------------------------------------------------------------
-- Équipe : postes issus du cahier des charges, noms fictifs, AUCUNE coordonnée.
-- -----------------------------------------------------------------------------
insert into public.team_members (name, position, biography, display_order, status) values
  ('[DEMO] Membre 1',  'CEO',                               '[DEMO] Biographie PLACEHOLDER.', 10,  'published'),
  ('[DEMO] Membre 2',  'Responsable commercial',            null, 20,  'published'),
  ('[DEMO] Membre 3',  'Chargé de communication',           null, 30,  'published'),
  ('[DEMO] Membre 4',  'Community manager',                 null, 40,  'published'),
  ('[DEMO] Membre 5',  'Graphiste',                         null, 50,  'published'),
  ('[DEMO] Membre 6',  'Photographe / vidéaste',            null, 60,  'published'),
  ('[DEMO] Membre 7',  'Responsable événementiel',          null, 70,  'published'),
  ('[DEMO] Membre 8',  'Assistant administratif',           null, 80,  'draft'),
  ('[DEMO] Membre 9',  'Comptable',                         null, 90,  'draft'),
  ('[DEMO] Membre 10', 'Prestataires / consultants externes', null, 100, 'draft');

-- -----------------------------------------------------------------------------
-- Témoignages (fictifs)
-- -----------------------------------------------------------------------------
insert into public.testimonials (name, company, role, content, display_order, is_featured, status) values
  ('[DEMO] Client A', '[DEMO] Entreprise A', '[DEMO] Fonction', '[DEMO] Témoignage fictif de démonstration. PLACEHOLDER.', 10, true, 'published'),
  ('[DEMO] Client B', '[DEMO] Entreprise B', null,              '[DEMO] Témoignage fictif en brouillon.',                 20, false, 'draft');

-- -----------------------------------------------------------------------------
-- Réseaux sociaux : URLs génériques, à remplacer par les comptes officiels.
-- -----------------------------------------------------------------------------
insert into public.social_links (platform, label, url, display_order, is_active) values
  ('facebook',  '[DEMO] Facebook',  'https://www.facebook.com/',  10, true),
  ('instagram', '[DEMO] Instagram', 'https://www.instagram.com/', 20, true),
  ('linkedin',  '[DEMO] LinkedIn',  'https://www.linkedin.com/',  30, true);

-- -----------------------------------------------------------------------------
-- Demandes (fictives, adresses en example.com — domaine réservé)
-- -----------------------------------------------------------------------------
insert into public.quote_requests (name, company, email, phone, service_id, budget, deadline, message, status)
select '[DEMO] Prospect A', '[DEMO] Société A', 'prospect-a@example.com', '+221 00 000 00 00',
  s.id, '[DEMO] Budget à préciser', current_date + 45,
  '[DEMO] Message de demande de devis fictif.', 'new'
from public.services s where s.slug = 'demo-communication-digitale';

insert into public.contact_messages (name, email, subject, message, status) values
  ('[DEMO] Visiteur A', 'visiteur-a@example.com', '[DEMO] Question', '[DEMO] Message de contact fictif.', 'new');
