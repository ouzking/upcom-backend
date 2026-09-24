-- =============================================================================
-- UPCOM — 010 · Durcissement des privilèges
-- -----------------------------------------------------------------------------
-- Supabase accorde par défaut ALL aux rôles anon/authenticated sur `public`.
-- La RLS reste la barrière principale ; on retire en plus les privilèges
-- inutiles (défense en profondeur) :
--   * anon : lecture seule. Aucune écriture publique directe — les formulaires
--     passent par des Edge Functions.
--   * TRUNCATE / REFERENCES / TRIGGER ne sont pas soumis à la RLS : retirés.
-- Les tables futures héritent de ces règles (ALTER DEFAULT PRIVILEGES).
-- =============================================================================

revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from anon;

revoke truncate, references, trigger
  on all tables in schema public from authenticated;

alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from anon;

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger on tables from authenticated;
