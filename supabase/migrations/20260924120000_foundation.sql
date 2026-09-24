-- =============================================================================
-- UPCOM — 001 · Fondations
-- -----------------------------------------------------------------------------
-- * Schéma `private` : fonctions internes (helpers RLS, triggers). Il n'est PAS
--   exposé par l'API (PostgREST n'expose que `public` et `graphql_public`).
-- * Types énumérés partagés par tout le modèle.
-- * Fonctions utilitaires de triggers (updated_at, slug, published_at).
-- =============================================================================

create schema if not exists private;

revoke all on schema private from public;
-- USAGE est nécessaire : les policies RLS sont évaluées avec les droits de
-- l'appelant (anon / authenticated) et appellent des fonctions de ce schéma.
grant usage on schema private to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------

-- Cycle de vie éditorial commun à tous les contenus publics.
create type public.content_status as enum ('draft', 'published', 'archived');

-- Rôles du back-office.
create type public.app_role as enum (
  'super_admin',
  'editor',
  'commercial',
  'communication_manager'
);

-- Permissions atomiques. Les policies RLS vérifient des PERMISSIONS, jamais
-- des rôles : la matrice rôle → permissions vit dans `public.role_permissions`.
create type public.app_permission as enum (
  'services.manage',
  'projects.manage',
  'articles.manage',
  'events.manage',
  'team.manage',
  'testimonials.manage',
  'quotes.view',
  'quotes.manage',
  'contacts.view',
  'contacts.manage',
  'settings.manage',
  'users.manage'
);

create type public.quote_status as enum (
  'new',
  'in_progress',
  'contacted',
  'converted',
  'closed'
);

create type public.contact_status as enum ('new', 'read', 'replied', 'archived');

create type public.social_platform as enum (
  'facebook',
  'instagram',
  'linkedin',
  'x',
  'youtube',
  'tiktok',
  'whatsapp',
  'other'
);

-- -----------------------------------------------------------------------------
-- Triggers utilitaires
-- -----------------------------------------------------------------------------

-- Maintient `updated_at` à jour à chaque UPDATE.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Transforme un texte (français compris) en slug URL : "Événement été 2026" → "evenement-ete-2026".
-- Implémenté sans l'extension `unaccent` pour rester portable.
create or replace function private.slugify(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    translate(
      replace(replace(lower(value), 'œ', 'oe'), 'æ', 'ae'),
      'àáâãäåāçćčèéêëēėęîïíīįìłñńôöòóœøōõßśšûüùúūÿžźż',
      'aaaaaaaccceeeeeeeiiiiiilnnoooooooosssuuuuuyzzz'
    ),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- Génère un slug unique à partir d'une colonne source (TG_ARGV[0], défaut `title`)
-- lorsque le slug fourni est vide. Un slug fourni explicitement est normalisé
-- (minuscules, trim) et validé par la contrainte CHECK de la table.
create or replace function private.ensure_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  source_column text := coalesce(tg_argv[0], 'title');
  base_slug text;
  candidate text;
  suffix integer := 1;
  taken boolean;
begin
  if new.slug is null or btrim(new.slug) = '' then
    base_slug := coalesce(nullif(private.slugify(to_jsonb(new) ->> source_column), ''), 'element');
    candidate := base_slug;
    loop
      execute format(
        'select exists (select 1 from %I.%I where slug = $1 and id <> $2)',
        tg_table_schema, tg_table_name
      ) into taken using candidate, new.id;
      exit when not taken;
      suffix := suffix + 1;
      candidate := base_slug || '-' || suffix;
    end loop;
    new.slug := candidate;
  else
    new.slug := lower(btrim(new.slug));
  end if;
  return new;
end;
$$;

-- Renseigne `published_at` lors de la première publication.
create or replace function private.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

revoke all on all functions in schema private from public;
grant execute on function private.slugify(text) to anon, authenticated, service_role;
