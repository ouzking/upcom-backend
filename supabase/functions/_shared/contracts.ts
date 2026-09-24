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
  | "communication_manager";

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
