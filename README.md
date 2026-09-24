# upcom-backend

Backend **Supabase** du projet **UPCOM AGENCY & SERVICES** : base PostgreSQL, sécurité (Auth, RLS),
Storage, Edge Functions et **types TypeScript partagés** avec les deux applications :

| Dépôt | Rôle | Accès Supabase |
|---|---|---|
| `upcom-frontend` | Site public (React) | clé publishable/anon : lecture des contenus publiés, formulaires via Edge Functions |
| `upcom-admin` | Back-office (React) | session utilisateur (JWT) : droits selon le rôle, appliqués par la RLS |
| **`upcom-backend`** | **Ce dépôt** | migrations, policies, fonctions, types — aucun code d'interface |

Les trois dépôts utilisent **le même projet Supabase**.

📚 Documentation détaillée : [architecture & modèle de données](docs/architecture.md) ·
[sécurité (Auth, RLS, Storage, secrets)](docs/security.md) · [contrat des Edge Functions](docs/edge-functions.md)

---

## Sommaire

1. [Architecture](#1-architecture)
2. [Structure du dépôt](#2-structure-du-dépôt)
3. [Installation locale](#3-installation-locale)
4. [Création et configuration du projet Supabase](#4-création-et-configuration-du-projet-supabase)
5. [Migrations](#5-migrations)
6. [Seed](#6-seed)
7. [Authentification et rôles](#7-authentification-et-rôles)
8. [Row Level Security](#8-row-level-security)
9. [Storage](#9-storage)
10. [Edge Functions](#10-edge-functions)
11. [Variables d'environnement](#11-variables-denvironnement)
12. [Types TypeScript (frontend & admin)](#12-types-typescript-frontend--admin)
13. [Tests et CI](#13-tests-et-ci)
14. [Déploiement](#14-déploiement)

---

## 1. Architecture

```
upcom-frontend ──(anon: SELECT publiés)────────┐
upcom-frontend ──(POST formulaires)──▶ Edge Functions ──(service_role)──┐
upcom-admin ────(JWT: CRUD selon permissions)──┤                       ▼
                                                └──────────▶ PostgreSQL + RLS · Storage · Auth
```

- **Sécurité en base** : RLS sur toutes les tables, fondée sur des permissions
  (`private.has_permission('services.manage')`), jamais sur le frontend.
- **Pas d'écriture anonyme directe** : devis et messages passent par des Edge Functions qui valident,
  filtrent le spam, limitent le débit puis écrivent avec la `service_role`.
- **Modèle** : 15 tables — `profiles`, `role_permissions`, `service_categories`, `services`, `projects`,
  `project_images`, `article_categories`, `articles`, `events`, `team_members`, `testimonials`,
  `quote_requests`, `contact_messages`, `site_settings`, `social_links`.
  Voir le [diagramme et les relations](docs/architecture.md#3-modèle-de-données).

## 2. Structure du dépôt

```
upcom-backend/
├── supabase/
│   ├── config.toml                 # configuration locale (Auth, API, fonctions)
│   ├── migrations/                 # schéma versionné (tables + RLS + Storage)
│   ├── seed.sql                    # données de DÉMO (local uniquement)
│   ├── tests/database/             # tests pgTAP des policies RLS
│   └── functions/
│       ├── _shared/                # CORS, erreurs, validation zod, sécurité, e-mails, contrat d'API
│       ├── submit-quote-request/
│       ├── submit-contact-message/
│       ├── send-quote-notification/
│       ├── send-contact-notification/
│       └── admin-invite-user/
├── src/                            # package npm @upcom/supabase (types + constantes)
│   ├── database.types.ts           # GÉNÉRÉ depuis le schéma — ne pas éditer à la main
│   ├── models.ts                   # alias : ServiceRow, ArticleInsert, QuoteStatus…
│   ├── constants.ts                # charte, buckets, noms des fonctions, libellés FR
│   └── storage.ts                  # getPublicStorageUrl, buildStoragePath
├── docs/
└── .github/workflows/              # ci.yml (tests) · deploy.yml (déploiement manuel)
```

## 3. Installation locale

**Prérequis** : Node.js ≥ 20, [Docker Desktop](https://docs.docker.com/desktop/) (pour la stack locale),
[Deno 2](https://docs.deno.com/runtime/getting_started/installation/) (facultatif, pour tester les fonctions).
La Supabase CLI est exécutée via `npx supabase@2` (aucune installation globale requise).

```bash
git clone <url>/upcom-backend.git
cd upcom-backend
npm install                                  # installe TypeScript et construit le package

npm run db:start                             # démarre Supabase local + applique migrations et seed
cp supabase/functions/.env.example supabase/functions/.env
npm run functions:serve                      # sert les Edge Functions en local
```

`db:start` affiche les URLs et clés locales :

| Service | URL |
|---|---|
| API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| E-mails de test (invitations…) | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

## 4. Création et configuration du projet Supabase

1. Créer le projet sur [supabase.com/dashboard](https://supabase.com/dashboard) (région proche des
   utilisateurs, ex. `eu-west` / `eu-central`), noter le **Reference ID** et le **mot de passe de la base**.
2. Lier le dépôt :
   ```bash
   cp .env.example .env            # renseigner SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_ID, SUPABASE_DB_PASSWORD
   npx supabase@2 login
   npx supabase@2 link --project-ref <project-ref>
   ```
3. Appliquer le schéma : `npm run db:push` (migrations uniquement, **sans** seed de démo).
4. Déployer les fonctions et leurs secrets (voir [§10](#10-edge-functions)).
5. **Réglages du dashboard** (non versionnés par `config.toml` pour le projet hébergé) :
   - *Authentication → Sign In / Providers* : désactiver **Allow new users to sign up**, garder la
     confirmation d'e-mail, mot de passe ≥ 12 caractères.
   - *Authentication → URL Configuration* : **Site URL** = URL du back-office ; **Redirect URLs** =
     domaines UPCOM uniquement (ex. `https://admin.<domaine>/**`).
   - *Authentication → SMTP* : configurer un SMTP (le service intégré est limité).
   - *API* : vérifier que seuls `public` et `graphql_public` sont exposés (jamais `private`).
6. Suivre la [checklist production](docs/security.md#7-checklist-production).

## 5. Migrations

Les migrations de `supabase/migrations/` recréent entièrement le backend (tables, index, triggers,
RLS, buckets, données de référence officielles). Chaque table est créée **avec** ses policies.

```bash
npm run db:reset        # local : recrée la base depuis zéro (migrations + seed)
npm run db:push         # distant : applique les migrations manquantes
```

Ajouter une évolution :

```bash
npx supabase@2 migration new add_newsletter      # crée supabase/migrations/<timestamp>_add_newsletter.sql
# … écrire le SQL (table + RLS + index), puis :
npm run db:reset && npm run db:test && npm run types:gen
```

Règles : ne jamais modifier une migration déjà appliquée en production ; toute nouvelle table
de `public` doit activer la RLS et définir ses policies dans la même migration.

## 6. Seed

`supabase/seed.sql` est exécuté **uniquement en local** (`db:start`, `db:reset`). Toutes ses données
sont **fictives et préfixées `[DEMO]`** : services, réalisations, article (publié, programmé, brouillon),
événements, équipe (postes du cahier des charges, sans coordonnées), témoignages, réseaux sociaux
génériques, une demande de devis et un message (adresses `example.com`).

Les **données officielles** (6 pôles d'activité, nom, adresse et téléphones d'UPCOM) sont insérées par
les migrations et donc présentes aussi en production. Ne jamais lancer le seed en production
(`db push` ne l'exécute pas par défaut).

## 7. Authentification et rôles

- Pas d'inscription publique : comptes créés **par invitation** (`admin-invite-user`).
- Rôles : `super_admin`, `editor`, `commercial`, `communication_manager` —
  [matrice des permissions](docs/security.md#2-rôles-et-permissions).
- Un nouvel utilisateur a un profil **sans rôle** (= visiteur) jusqu'à attribution.
- Côté admin, `supabase.rpc("get_my_access")` renvoie le rôle et les permissions pour adapter l'UI
  (la sécurité réelle reste en base).

**Créer le premier super_admin** (une seule fois par environnement) :

1. *Authentication → Users → Invite user* (ou, en local, *Add user* dans le Studio).
2. Dans le *SQL Editor* :
   ```sql
   update public.profiles
   set role = 'super_admin'
   where email = 'adresse@du-responsable';
   ```
Les membres suivants sont invités depuis le back-office (`admin-invite-user`).

## 8. Row Level Security

Résumé (détail et justification : [docs/security.md](docs/security.md#3-row-level-security)) :

- **Visiteurs** : lecture seule des contenus `published` (articles : date de publication atteinte),
  des paramètres du site et des réseaux sociaux actifs. Aucune écriture, aucun accès aux profils,
  devis ou messages.
- **Équipe** : lecture de tous les contenus (brouillons compris) ; écriture selon la permission du domaine.
- **Demandes** : visibles uniquement avec `quotes.view` / `contacts.view` ; seules les colonnes de
  suivi sont modifiables.
- Privilèges SQL durcis (anon en lecture seule, pas de TRUNCATE) en complément de la RLS.

## 9. Storage

7 buckets publics en lecture (images du site) : `site-assets`, `services`, `projects`, `team`,
`articles`, `events`, `testimonials`. Écriture réservée à la permission du domaine, taille et types
MIME limités côté serveur, listing interdit aux visiteurs.
Les tables stockent le **chemin** (`services/<id>/fichier.webp`), pas l'URL :

```ts
import { getPublicStorageUrl, buildStoragePath, STORAGE_BUCKETS } from "@upcom/supabase";

// upcom-admin : upload
const path = buildStoragePath(`services/${service.id}`, file.name);
await supabase.storage.from(STORAGE_BUCKETS.services).upload(path, file, { contentType: file.type });
await supabase.from("services").update({ image_path: path }).eq("id", service.id);

// upcom-frontend : affichage
const src = getPublicStorageUrl(import.meta.env.VITE_SUPABASE_URL, "services", service.image_path);
```

## 10. Edge Functions

| Fonction | Accès | Rôle |
|---|---|---|
| `submit-quote-request` | public | valide et enregistre une demande de devis, notifie l'équipe |
| `submit-contact-message` | public | valide et enregistre un message de contact, notifie l'équipe |
| `send-quote-notification` | webhook / back-office | (r)envoie l'e-mail d'une demande de devis |
| `send-contact-notification` | webhook / back-office | (r)envoie l'e-mail d'un message |
| `admin-invite-user` | back-office (`users.manage`) | invite un membre et lui attribue un rôle |

Chaîne de sécurité des formulaires : CORS → JSON ≤ 32 Ko → validation zod stricte → honeypot →
Cloudflare Turnstile (si configuré) → rate-limit par IP hashée → insertion `service_role` →
notification e-mail en arrière-plan. Contrat complet : [docs/edge-functions.md](docs/edge-functions.md).

```bash
npm run functions:serve                                          # local
npx supabase@2 secrets set --env-file supabase/functions/.env.production   # secrets distants
npm run functions:deploy                                         # déploiement de toutes les fonctions
```

## 11. Variables d'environnement

**Edge Functions** (`supabase/functions/.env` en local, `supabase secrets set` en production) —
modèle : [`supabase/functions/.env.example`](supabase/functions/.env.example)

| Variable | Obligatoire | Description |
|---|:-:|---|
| `ALLOWED_ORIGINS` | ✅ | origines CORS autorisées (site + admin), séparées par des virgules |
| `IP_HASH_SALT` | ✅ | sel du hachage des IP (`openssl rand -hex 32`) |
| `NOTIFICATION_WEBHOOK_SECRET` | ✅ | secret de l'en-tête `x-webhook-secret` |
| `RESEND_API_KEY`, `EMAIL_FROM` | prod | envoi des e-mails (vide = désactivé) |
| `NOTIFICATION_EMAIL_TO` | prod | destinataires des notifications |
| `QUOTE_NOTIFICATION_EMAIL_TO`, `CONTACT_NOTIFICATION_EMAIL_TO` | | destinataires spécifiques |
| `ADMIN_APP_URL` | | lien vers le back-office dans les e-mails |
| `ADMIN_INVITE_REDIRECT_URL` | | page d'acceptation d'invitation dans upcom-admin |
| `TURNSTILE_SECRET_KEY` | recommandé | anti-bot Cloudflare Turnstile |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | auto | injectées par Supabase — ne pas définir |

**CLI / CI** (`.env` local, GitHub Actions secrets) : `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`,
`SUPABASE_DB_PASSWORD` — modèle : [`.env.example`](.env.example).

**Applications React** (dans leurs propres dépôts) — uniquement des valeurs publiques :

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…     # ou l'ancienne clé anon
VITE_TURNSTILE_SITE_KEY=…                          # upcom-frontend, si Turnstile activé
```

> ⛔ La `service_role` / clé secrète ne doit **jamais** apparaître dans `upcom-frontend`,
> `upcom-admin`, un fichier commité ou une variable `VITE_*`.

## 12. Types TypeScript (frontend & admin)

`src/database.types.ts` est **généré** depuis le schéma :

```bash
npm run types:gen            # depuis la base locale
npm run types:gen:linked     # depuis le projet lié
```

Ce dépôt est aussi le package **`@upcom/supabase`**. Dans `upcom-frontend` et `upcom-admin` :

```bash
npm install github:<organisation>/upcom-backend#v0.1.0   # tag Git = version du schéma
```

```ts
import { createClient } from "@supabase/supabase-js";
import type { Database, ServiceRow, SubmitQuoteRequestPayload } from "@upcom/supabase";
import { EDGE_FUNCTIONS, QUOTE_STATUS_LABELS, BRAND } from "@upcom/supabase";

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

const { data } = await supabase
  .from("services")
  .select("id, title, slug, short_description, image_path, category:service_categories(name, slug)")
  .eq("status", "published")
  .order("display_order");        // data est entièrement typé
```

Le package exporte : `Database` et helpers `Tables/TablesInsert/TablesUpdate/Enums`, les alias
(`ServiceRow`, `ArticleInsert`, `QuoteRequestUpdate`…), les contrats des Edge Functions, et des
constantes (`BRAND`, `STORAGE_BUCKETS`, `EDGE_FUNCTIONS`, libellés français des statuts et rôles).
Pour un dépôt privé, l'installation Git utilise les accès GitHub du développeur / de la CI.
Après une migration : `npm run types:gen`, commit, nouveau tag, puis mise à jour du tag dans les apps.

## 13. Tests et CI

```bash
npm run db:test          # tests pgTAP : RLS publique, rôles, garde-fous des profils
npm run db:lint          # analyse statique PL/pgSQL
npm run functions:test   # tests Deno : validation, sécurité, gabarits e-mail
npm run typecheck        # package de types
```

`.github/workflows/ci.yml` exécute à chaque push / PR : démarrage de la base (migrations + seed),
lint SQL, tests pgTAP, **vérification que les types générés sont à jour**, `deno check/lint/test`
des fonctions, typecheck du package.

## 14. Déploiement

**Manuel :**

```bash
npm run db:push                                                   # schéma
npx supabase@2 secrets set --env-file supabase/functions/.env.production
npm run functions:deploy                                          # fonctions
```

**GitHub Actions** : `Actions → Deploy → Run workflow` (`all` | `database` | `functions`), avec les
secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID` sur l'environnement
`production` (activer *Required reviewers* pour exiger une validation).

Ordre recommandé pour une évolution : migration → tests → `types:gen` → tag → déploiement backend →
mise à jour de `@upcom/supabase` dans `upcom-admin` puis `upcom-frontend`.

---

**UPCOM AGENCY & SERVICES** — Ouest Foire, Cité Air Afrique, Lot 13 — 77 402 74 94 · 77 835 92 94
