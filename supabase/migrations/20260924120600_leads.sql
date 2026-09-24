-- =============================================================================
-- UPCOM — 007 · Demandes commerciales : devis et messages de contact
-- -----------------------------------------------------------------------------
-- DONNÉES PRIVÉES (données personnelles de prospects).
--
--   * Aucune insertion possible via l'API publique : les formulaires passent
--     par les Edge Functions `submit-quote-request` / `submit-contact-message`
--     (validation, anti-spam, rate-limit) qui écrivent avec la service_role.
--   * Lecture / traitement réservés aux permissions quotes.* / contacts.*.
--   * Le contenu soumis par le prospect est immuable : l'équipe ne peut
--     modifier que les colonnes de suivi (privilèges par colonne).
--
--   services 1 ── n quote_requests (service_id, optionnel)
--   profiles 1 ── n quote_requests (assigned_to, commercial en charge)
-- =============================================================================

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  company text check (company is null or char_length(company) <= 160),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or phone ~ '^\+?[0-9 ().-]{6,30}$'),
  service_id uuid references public.services (id) on delete set null,
  budget text check (budget is null or char_length(budget) <= 100),
  deadline date,
  message text not null check (char_length(message) between 10 and 5000),
  status public.quote_status not null default 'new',
  assigned_to uuid references public.profiles (id) on delete set null,
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 10000),
  ip_hash text,
  user_agent text check (user_agent is null or char_length(user_agent) <= 500),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.quote_requests is
  'Demandes de devis. Écriture publique uniquement via Edge Function.';
comment on column public.quote_requests.ip_hash is
  'SHA-256 salé de l''IP (anti-abus). L''IP en clair n''est jamais stockée.';
comment on column public.quote_requests.notified_at is
  'Date d''envoi de la notification e-mail à l''équipe (idempotence).';

create index quote_requests_status_created_idx on public.quote_requests (status, created_at desc);
create index quote_requests_service_id_idx on public.quote_requests (service_id);
create index quote_requests_assigned_to_idx on public.quote_requests (assigned_to);
create index quote_requests_rate_limit_idx on public.quote_requests (ip_hash, created_at desc);

create trigger quote_requests_set_updated_at
  before update on public.quote_requests
  for each row execute function private.set_updated_at();

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or phone ~ '^\+?[0-9 ().-]{6,30}$'),
  subject text check (subject is null or char_length(subject) <= 200),
  message text not null check (char_length(message) between 10 and 5000),
  status public.contact_status not null default 'new',
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 10000),
  ip_hash text,
  user_agent text check (user_agent is null or char_length(user_agent) <= 500),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.contact_messages is
  'Messages du formulaire de contact. Écriture publique uniquement via Edge Function.';

create index contact_messages_status_created_idx on public.contact_messages (status, created_at desc);
create index contact_messages_rate_limit_idx on public.contact_messages (ip_hash, created_at desc);

create trigger contact_messages_set_updated_at
  before update on public.contact_messages
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Privilèges (défense en profondeur, en plus de la RLS)
-- -----------------------------------------------------------------------------
revoke all on public.quote_requests from anon, authenticated;
revoke all on public.contact_messages from anon, authenticated;

grant select, delete on public.quote_requests to authenticated;
grant update (status, assigned_to, internal_notes) on public.quote_requests to authenticated;

grant select, delete on public.contact_messages to authenticated;
grant update (status, internal_notes) on public.contact_messages to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.quote_requests enable row level security;
alter table public.contact_messages enable row level security;

create policy "quote_requests_select_viewers"
  on public.quote_requests for select
  to authenticated
  using ((select private.has_permission('quotes.view')));

create policy "quote_requests_update_managers"
  on public.quote_requests for update
  to authenticated
  using ((select private.has_permission('quotes.manage')))
  with check ((select private.has_permission('quotes.manage')));

create policy "quote_requests_delete_managers"
  on public.quote_requests for delete
  to authenticated
  using ((select private.has_permission('quotes.manage')));

create policy "contact_messages_select_viewers"
  on public.contact_messages for select
  to authenticated
  using ((select private.has_permission('contacts.view')));

create policy "contact_messages_update_managers"
  on public.contact_messages for update
  to authenticated
  using ((select private.has_permission('contacts.manage')))
  with check ((select private.has_permission('contacts.manage')));

create policy "contact_messages_delete_managers"
  on public.contact_messages for delete
  to authenticated
  using ((select private.has_permission('contacts.manage')));
