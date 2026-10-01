-- =============================================================================
-- UPCOM — 011 · Temps réel sur les demandes commerciales
-- -----------------------------------------------------------------------------
-- Le back-office est notifié instantanément d'un nouveau devis / message
-- (supabase.channel(...).on('postgres_changes', ...)) au lieu d'interroger la
-- base toutes les 60 secondes.
--
-- Sécurité : Realtime applique la RLS de la table à chaque abonné. Un
-- utilisateur ne reçoit un événement que s'il pourrait lire la ligne
-- (quotes.view / contacts.view). Les visiteurs anonymes ne reçoivent rien.
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quote_requests'
  ) then
    alter publication supabase_realtime add table public.quote_requests;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contact_messages'
  ) then
    alter publication supabase_realtime add table public.contact_messages;
  end if;
end;
$$;
