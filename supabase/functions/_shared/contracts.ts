/**
 * Contrat d'API des Edge Functions UPCOM.
 *
 * Ce fichier ne contient QUE des types (aucun import, aucune API Deno) :
 * il est utilisé par les Edge Functions ET réexporté par le package npm
 * `@upcom/supabase` pour upcom-frontend et upcom-admin.
 */

export type AppRoleName =
  | "super_admin"
  | "editor"
  | "commercial"
  | "communication_manager"
  | "viewer";

export type AppPermissionName =
  | "services.manage"
  | "projects.manage"
  | "articles.manage"
  | "events.manage"
  | "team.manage"
  | "testimonials.manage"
  | "quotes.view"
  | "quotes.manage"
  | "contacts.view"
  | "contacts.manage"
  | "settings.manage"
  | "users.manage";

// ---------------------------------------------------------------------------
// Enveloppe de réponse commune
// ---------------------------------------------------------------------------

export type ApiErrorCode =
  | "validation_error"
  | "invalid_json"
  | "unsupported_media_type"
  | "payload_too_large"
  | "method_not_allowed"
  | "forbidden_origin"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "captcha_failed"
  | "internal_error";

export interface ValidationIssue {
  /** Chemin du champ en erreur (ex. "email"), "_" pour une erreur globale. */
  field: string;
  message: string;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: ApiErrorCode;
    /** Message en français, affichable à l'utilisateur. */
    message: string;
    details?: ValidationIssue[];
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

// ---------------------------------------------------------------------------
// POST /functions/v1/submit-quote-request  (public)
// ---------------------------------------------------------------------------

export interface SubmitQuoteRequestPayload {
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  /** UUID d'un service publié. */
  service_id?: string | null;
  budget?: string | null;
  /** Date souhaitée au format AAAA-MM-JJ (pas dans le passé). */
  deadline?: string | null;
  message: string;
  /** Jeton Cloudflare Turnstile (obligatoire si TURNSTILE_SECRET_KEY est configuré). */
  captcha_token?: string;
  /** Honeypot anti-spam : champ caché, doit rester vide. */
  website?: string;
}

export interface SubmitQuoteRequestResult {
  id: string;
}

// ---------------------------------------------------------------------------
// POST /functions/v1/submit-contact-message  (public)
// ---------------------------------------------------------------------------

export interface SubmitContactMessagePayload {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  captcha_token?: string;
  /** Honeypot anti-spam : champ caché, doit rester vide. */
  website?: string;
}

export interface SubmitContactMessageResult {
  id: string;
}

// ---------------------------------------------------------------------------
// POST /functions/v1/send-quote-notification
// POST /functions/v1/send-contact-notification
// Appel interne (Database Webhook + en-tête x-webhook-secret) ou par un membre
// du back-office (JWT) pour renvoyer une notification.
// ---------------------------------------------------------------------------

export interface SendNotificationPayload {
  id: string;
  /** Renvoyer même si déjà notifié (réservé au back-office). */
  force?: boolean;
}

export type SendNotificationResult =
  | { status: "sent" }
  | { status: "already_notified" }
  | { status: "skipped"; reason: string };

// ---------------------------------------------------------------------------
// POST /functions/v1/admin-invite-user  (permission users.manage)
// ---------------------------------------------------------------------------

export interface AdminInviteUserPayload {
  email: string;
  full_name?: string | null;
  role: AppRoleName;
}

export interface AdminInviteUserResult {
  user_id: string;
  email: string;
  role: AppRoleName;
}

// ---------------------------------------------------------------------------
// POST /functions/v1/admin-delete-user  (permission users.manage)
// Suppression définitive d'un compte (Auth + profil). Impossible sur son
// propre compte et sur le dernier super_admin actif.
// ---------------------------------------------------------------------------

export interface AdminDeleteUserPayload {
  user_id: string;
}

export interface AdminDeleteUserResult {
  user_id: string;
}

// ---------------------------------------------------------------------------
// POST /functions/v1/cleanup-media  (permission settings.manage)
// Images qui ne sont plus utilisées par aucun contenu. `dry_run` (défaut :
// true) liste sans supprimer ; `dry_run: false` supprime.
// ---------------------------------------------------------------------------

export interface CleanupMediaPayload {
  dry_run?: boolean;
}

export interface OrphanMediaFile {
  bucket: string;
  path: string;
  size_bytes: number | null;
  created_at: string;
}

export interface CleanupMediaResult {
  dry_run: boolean;
  files: OrphanMediaFile[];
  total_bytes: number;
  deleted: number;
}

// ---------------------------------------------------------------------------
// POST /functions/v1/trigger-site-rebuild  (toute permission de contenu)
// Relance la génération du site public (Netlify build hook) pour que les
// nouveaux contenus aient leur page HTML et leur entrée dans le sitemap.
// ---------------------------------------------------------------------------

export type TriggerSiteRebuildResult =
  | { status: "triggered" }
  | { status: "skipped"; reason: "not_configured" | "recently_triggered" };
