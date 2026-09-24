# Sécurité : Auth, RLS, Storage, secrets

## 1. Authentification

- **Supabase Auth**, e-mail + mot de passe (12 caractères min., majuscules/minuscules/chiffres).
- **Inscriptions publiques désactivées** (`enable_signup = false`). Les comptes du back-office sont
  créés **uniquement par invitation** (Edge Function `admin-invite-user`, permission `users.manage`).
- À la création d'un utilisateur, le trigger `on_auth_user_created` crée un `profiles` **sans rôle**.
  Un compte sans rôle a exactement les droits d'un visiteur anonyme.
- Le rôle n'est **jamais** lu depuis `raw_user_meta_data` (modifiable par l'utilisateur lui-même).

## 2. Rôles et permissions

Les policies vérifient des **permissions** ; la matrice rôle → permissions est dans
`public.role_permissions` (modifiable uniquement par migration). `super_admin` possède implicitement
toutes les permissions.

| Permission | super_admin | editor | communication_manager | commercial |
|---|:-:|:-:|:-:|:-:|
| `services.manage` | ✅ | ✅ | | |
| `projects.manage` | ✅ | ✅ | ✅ | |
| `articles.manage` | ✅ | ✅ | ✅ | |
| `events.manage` | ✅ | ✅ | ✅ | |
| `team.manage` | ✅ | ✅ | | |
| `testimonials.manage` | ✅ | ✅ | ✅ | |
| `quotes.view` / `quotes.manage` | ✅ | | | ✅ |
| `contacts.view` / `contacts.manage` | ✅ | | ✅ | ✅ |
| `settings.manage` | ✅ | | ✅ | |
| `users.manage` | ✅ | | | |

Tout membre actif du back-office (rôle non nul, `is_active`) peut **lire** les contenus non publiés
(brouillons) pour la prévisualisation.

Pour faire évoluer la matrice : nouvelle migration `insert into public.role_permissions …` /
`delete from …`, et éventuellement `alter type public.app_permission add value …`.

### Garde-fous sur `profiles` (trigger `guard_profile_changes`)

- `role` et `is_active` : modifiables uniquement avec `users.manage` (ou côté serveur).
- Seul un `super_admin` peut attribuer le rôle `super_admin`.
- `id` et `email` : non modifiables via l'API (l'e-mail est synchronisé depuis `auth.users`).
- Le **dernier super_admin actif** ne peut être ni rétrogradé ni désactivé.

## 3. Row Level Security

RLS activée sur **toutes** les tables de `public`. Helpers (schéma `private`, non exposé par l'API,
`SECURITY DEFINER`, `search_path` vide) : `private.is_staff()`, `private.has_permission(p)`,
`private.get_my_role()`. Ils sont appelés sous forme `(select …)` pour être évalués une seule fois
par requête (performance).

| Table | Lecture visiteur (anon) | Lecture équipe | Écriture |
|---|---|---|---|
| `service_categories`, `services`, `projects`, `events`, `team_members`, `testimonials` | `status = 'published'` | tout | permission du domaine |
| `project_images` | si le projet parent est publié | tout | `projects.manage` |
| `articles` | publié **et** `published_at <= now()` | tout | `articles.manage` |
| `article_categories` | tout | tout | `articles.manage` |
| `site_settings` | tout | tout | UPDATE `settings.manage` (pas d'INSERT/DELETE) |
| `social_links` | `is_active` | tout | `settings.manage` |
| `quote_requests` | ❌ | `quotes.view` | UPDATE/DELETE `quotes.manage` ; INSERT : Edge Function uniquement |
| `contact_messages` | ❌ | `contacts.view` | UPDATE/DELETE `contacts.manage` ; INSERT : Edge Function uniquement |
| `profiles` | ❌ | son profil + membres du back-office | son nom ; rôles : `users.manage` |
| `role_permissions` | ❌ | membres du back-office | ❌ (migration) |

### Défense en profondeur (privilèges SQL)

- `anon` : **SELECT uniquement** sur `public` (INSERT/UPDATE/DELETE révoqués, y compris pour les
  tables futures via `ALTER DEFAULT PRIVILEGES`).
- `TRUNCATE`, `REFERENCES`, `TRIGGER` (non soumis à la RLS) révoqués pour `anon` et `authenticated`.
- `quote_requests` / `contact_messages` : aucun privilège pour `anon` ; pour `authenticated`,
  UPDATE limité aux colonnes de suivi (`status`, `assigned_to`, `internal_notes`) —
  le contenu soumis par le prospect est **immuable**.

Ces règles sont couvertes par les tests pgTAP de `supabase/tests/database/`.

## 4. Storage

| Bucket | Public (lecture) | Taille max | Types | Écriture |
|---|:-:|---|---|---|
| `site-assets` | ✅ | 5 Mo | JPEG, PNG, WebP, AVIF, SVG, ICO | `settings.manage` |
| `services` | ✅ | 5 Mo | JPEG, PNG, WebP, AVIF | `services.manage` |
| `projects` | ✅ | 10 Mo | idem | `projects.manage` |
| `team` | ✅ | 5 Mo | idem | `team.manage` |
| `articles` | ✅ | 5 Mo | idem | `articles.manage` |
| `events` | ✅ | 10 Mo | idem | `events.manage` |
| `testimonials` | ✅ | 2 Mo | idem | `testimonials.manage` |

- Lecture via URL publique (CDN), **sans policy SELECT pour anon** : les visiteurs ne peuvent pas lister
  le contenu des buckets. Le listing (médiathèque) est réservé aux membres du back-office.
- Types MIME et tailles appliqués par Storage côté serveur.
- ⚠️ Un fichier d'un bucket public est accessible à qui connaît son chemin, même si le contenu associé
  est en brouillon. **Ne jamais y déposer de document confidentiel** (créer un bucket privé + URLs
  signées si ce besoin apparaît).
- SVG autorisé uniquement dans `site-assets` (logos), réservé à `settings.manage`.

## 5. Edge Functions

| Fonction | Appelant | Contrôle |
|---|---|---|
| `submit-quote-request`, `submit-contact-message` | site public | CORS, JSON ≤ 32 Ko, zod strict (champs inconnus refusés), honeypot, Turnstile (si configuré), rate-limit IP hashée (3 devis / 5 messages par 15 min) |
| `send-quote-notification`, `send-contact-notification` | Database Webhook / serveur, ou back-office | en-tête `x-webhook-secret` (comparaison en temps constant) **ou** JWT + `quotes.view` / `contacts.view` ; renvoi forcé réservé au back-office |
| `admin-invite-user` | back-office | JWT vérifié (passerelle + code) + `users.manage` ; `super_admin` seul peut inviter un `super_admin` |

Les droits sont lus en base via la RPC `get_my_access` exécutée avec le JWT de l'appelant :
une seule source de vérité. Les erreurs internes sont journalisées côté serveur et masquées au client.

## 6. Secrets

| Secret | Où il vit | Jamais dans |
|---|---|---|
| `service_role` / clés secrètes | injectée automatiquement dans les Edge Functions | frontend, Git, CI de frontend |
| `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `IP_HASH_SALT`, `NOTIFICATION_WEBHOOK_SECRET` | `supabase secrets set` | Git |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` | `.env` local / GitHub Actions secrets | Git |

Seules l'URL du projet et la clé **publishable/anon** vont dans `upcom-frontend` / `upcom-admin`.
`.gitignore` exclut tous les `.env` sauf les modèles `*.example`.

## 7. Checklist production

- [ ] Auth → URL Configuration : `Site URL` = URL du back-office, redirections autorisées limitées aux domaines UPCOM.
- [ ] Auth → Providers → Email : inscriptions désactivées, confirmation d'e-mail activée.
- [ ] Auth → SMTP : SMTP personnalisé (le SMTP intégré est limité en volume).
- [ ] Auth → activer la protection contre les mots de passe compromis (plans payants) et envisager la MFA pour `super_admin`.
- [ ] Secrets Edge Functions définis (`supabase secrets list`), `ALLOWED_ORIGINS` = domaines de production uniquement.
- [ ] `TURNSTILE_SECRET_KEY` configurée (et widget côté site public).
- [ ] Database → Advisors : aucun avertissement de sécurité.
- [ ] Sauvegardes (PITR selon plan) activées.
