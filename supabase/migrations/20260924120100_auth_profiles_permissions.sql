-- =============================================================================
-- UPCOM — 002 · Authentification, profils et permissions
-- -----------------------------------------------------------------------------
-- Modèle :
--   auth.users (Supabase Auth) 1 ── 1 public.profiles (rôle, état)
--   public.role_permissions : matrice rôle → permissions (versionnée ici)
--
-- Règles de sécurité :
--   * Un profil est créé automatiquement à l'inscription/invitation, SANS rôle
--     → aucun accès au back-office tant qu'un super_admin n'a pas attribué un rôle.
--   * Le rôle n'est JAMAIS lu depuis les métadonnées utilisateur (modifiables
--     par l'utilisateur lui-même).
--   * Un utilisateur ne peut pas modifier son propre rôle / statut : seul un
--     détenteur de `users.manage` (ou le backend en service_role) le peut.
--   * Le dernier super_admin actif ne peut pas être rétrogradé ou désactivé.
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text check (full_name is null or char_length(full_name) <= 120),
  role public.app_role,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Profil back-office lié à auth.users. role NULL = aucun accès administrateur.';

create index profiles_role_idx on public.profiles (role) where role is not null;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create table public.role_permissions (
  role public.app_role not null,
  permission public.app_permission not null,
  primary key (role, permission)
);

comment on table public.role_permissions is
  'Matrice rôle → permission. super_admin possède implicitement toutes les permissions.';

-- Matrice par défaut (super_admin : toutes les permissions, implicitement).
insert into public.role_permissions (role, permission) values
  ('editor', 'services.manage'),
  ('editor', 'projects.manage'),
  ('editor', 'articles.manage'),
  ('editor', 'events.manage'),
  ('editor', 'team.manage'),
  ('editor', 'testimonials.manage'),

  ('communication_manager', 'projects.manage'),
  ('communication_manager', 'articles.manage'),
  ('communication_manager', 'events.manage'),
  ('communication_manager', 'testimonials.manage'),
  ('communication_manager', 'contacts.view'),
  ('communication_manager', 'contacts.manage'),
  ('communication_manager', 'settings.manage'),

  ('commercial', 'quotes.view'),
  ('commercial', 'quotes.manage'),
  ('commercial', 'contacts.view'),
  ('commercial', 'contacts.manage');

-- -----------------------------------------------------------------------------
-- Helpers d'autorisation (utilisés par TOUTES les policies RLS)
-- SECURITY DEFINER : lisent profiles/role_permissions sans dépendre des policies
-- de ces tables (évite la récursion RLS). search_path vide = pas de détournement.
-- -----------------------------------------------------------------------------

-- Rôle de l'utilisateur courant (NULL si anonyme, sans rôle ou désactivé).
create or replace function private.get_my_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active;
$$;

-- Vrai si l'utilisateur courant est un membre actif du back-office.
create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.get_my_role() is not null;
$$;

-- Vrai si l'utilisateur courant détient la permission demandée.
create or replace function private.has_permission(requested public.app_permission)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.role = 'super_admin'
        or exists (
          select 1
          from public.role_permissions rp
          where rp.role = p.role
            and rp.permission = requested
        )
      from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active
        and p.role is not null
    ),
    false
  );
$$;

revoke all on function private.get_my_role() from public;
revoke all on function private.is_staff() from public;
revoke all on function private.has_permission(public.app_permission) from public;
grant execute on function private.get_my_role() to anon, authenticated, service_role;
grant execute on function private.is_staff() to anon, authenticated, service_role;
grant execute on function private.has_permission(public.app_permission) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RPC publique : droits de l'utilisateur connecté (pour adapter l'UI admin).
-- L'UI s'en sert pour l'affichage uniquement ; la sécurité reste en RLS.
-- -----------------------------------------------------------------------------
create or replace function public.get_my_access()
returns table (role public.app_role, permissions public.app_permission[])
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.role,
    case
      when p.role = 'super_admin' then enum_range(null::public.app_permission)
      else coalesce(
        array(
          select rp.permission
          from public.role_permissions rp
          where rp.role = p.role
          order by rp.permission
        ),
        '{}'::public.app_permission[]
      )
    end
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active
    and p.role is not null;
$$;

revoke all on function public.get_my_access() from public, anon;
grant execute on function public.get_my_access() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Synchronisation auth.users → profiles
-- -----------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 120), '')
  );
  -- Le rôle n'est volontairement PAS lu depuis raw_user_meta_data.
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = coalesce(new.email, '')
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Garde-fou sur les colonnes privilégiées de profiles
-- SECURITY INVOKER volontairement : `current_user` reflète le rôle réel de
-- l'appelant (anon / authenticated via l'API, service_role / postgres côté backend).
-- -----------------------------------------------------------------------------
create or replace function private.guard_profile_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_api_user constant boolean := current_user in ('anon', 'authenticated');
begin
  if is_api_user then
    if new.id is distinct from old.id or new.email is distinct from old.email then
      raise exception 'Les champs id et email du profil ne sont pas modifiables.'
        using errcode = '42501';
    end if;

    if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
       and not private.has_permission('users.manage') then
      raise exception 'Permission users.manage requise pour modifier un rôle ou un statut.'
        using errcode = '42501';
    end if;

    if new.role = 'super_admin' and old.role is distinct from new.role
       and private.get_my_role() is distinct from 'super_admin' then
      raise exception 'Seul un super_admin peut attribuer le rôle super_admin.'
        using errcode = '42501';
    end if;
  end if;

  -- Jamais de back-office sans super_admin actif, quel que soit l'appelant.
  if old.role = 'super_admin' and old.is_active
     and (new.role is distinct from 'super_admin' or not new.is_active)
     and not exists (
       select 1 from public.profiles p
       where p.role = 'super_admin' and p.is_active and p.id <> old.id
     ) then
    raise exception 'Impossible de retirer le dernier super_admin actif.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_changes
  before update on public.profiles
  for each row execute function private.guard_profile_changes();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.role_permissions enable row level security;

-- Chaque utilisateur voit son profil ; les membres du back-office voient les
-- autres membres (attribution des demandes, auteurs). Les visiteurs : rien.
create policy "profiles_select_self_or_staff"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));

-- Mise à jour de son propre profil (nom) ou de tout profil avec users.manage.
-- Les colonnes sensibles sont protégées par le trigger guard_profile_changes.
create policy "profiles_update_self_or_admin"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) or (select private.has_permission('users.manage')))
  with check (id = (select auth.uid()) or (select private.has_permission('users.manage')));

-- Pas de policy INSERT/DELETE : création par trigger, suppression via Auth Admin
-- (cascade depuis auth.users).

create policy "role_permissions_select_staff"
  on public.role_permissions for select
  to authenticated
  using ((select private.is_staff()));

-- La matrice n'est modifiable que par migration (pas de policy d'écriture).
