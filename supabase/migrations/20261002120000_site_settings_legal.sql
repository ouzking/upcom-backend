-- =============================================================================
-- UPCOM — 014 · Mentions légales dans les paramètres du site
-- -----------------------------------------------------------------------------
-- Informations légales modifiables depuis le back-office (settings.manage) et
-- affichées par la page « Mentions légales » du site public.
-- Valeurs officielles fournies par UPCOM le 2026-10-02.
-- =============================================================================

alter table public.site_settings
  add column legal_form text check (legal_form is null or char_length(legal_form) <= 120),
  add column rccm text check (rccm is null or char_length(rccm) <= 60),
  add column ninea text check (ninea is null or char_length(ninea) <= 30),
  add column publication_director text check (publication_director is null or char_length(publication_director) <= 160);

comment on column public.site_settings.legal_form is 'Forme juridique (ex. Entreprise individuelle).';
comment on column public.site_settings.rccm is 'Numéro du Registre du Commerce et du Crédit Mobilier.';
comment on column public.site_settings.ninea is 'Numéro d''Identification Nationale des Entreprises et Associations.';
comment on column public.site_settings.publication_director is 'Directeur / directrice de la publication (nom et fonction).';

update public.site_settings
set
  legal_form = 'Entreprise individuelle',
  rccm = 'SN.DKR.2018.A.4061',
  ninea = '006701941',
  publication_director = 'NANA NGOM THIAW, CEO (Chief Executive Officer)'
where id = 1;
