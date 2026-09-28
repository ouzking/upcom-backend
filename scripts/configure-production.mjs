#!/usr/bin/env node
/**
 * UPCOM — configuration du projet Supabase EN LIGNE (Auth + secrets des Edge Functions)
 * via la Management API officielle (https://api.supabase.com).
 *
 *   npm run prod:configure              → aperçu des changements (rien n'est modifié)
 *   npm run prod:configure -- --apply   → applique
 *
 * Lit .env (ignoré par Git) :
 *   SUPABASE_ACCESS_TOKEN   jeton personnel (Dashboard → Account → Access Tokens)
 *   SUPABASE_PROJECT_ID     référence du projet
 *   SITE_PUBLIC_URL         ex. https://www.upcomagency.com
 *   ADMIN_URL               ex. https://admin.upcomagency.com
 *   EXTRA_ALLOWED_ORIGINS   (facultatif) origines supplémentaires, séparées par des virgules
 *   RESEND_API_KEY          (facultatif) active l'envoi réel des e-mails via Resend
 *   EMAIL_FROM              (avec Resend) ex. "UPCOM <no-reply@upcomagency.com>" — domaine vérifié dans Resend
 *   NOTIFICATION_EMAIL_TO   (avec Resend) destinataires des alertes devis / messages
 *
 * Ce qui est configuré :
 *   - Auth : Site URL + Redirect URLs du back-office, connexion e-mail ACTIVE, inscriptions FERMÉES,
 *     mot de passe ≥ 12 caractères (a-z, A-Z, 0-9), e-mails en français (supabase/templates/)
 *   - Auth SMTP (si RESEND_API_KEY) : invitations / réinitialisations envoyées depuis votre domaine
 *   - Secrets Edge Functions : ALLOWED_ORIGINS, ADMIN_APP_URL, ADMIN_INVITE_REDIRECT_URL
 *     (+ RESEND_API_KEY, EMAIL_FROM, NOTIFICATION_EMAIL_TO si fournis)
 *
 * Aucune valeur secrète n'est affichée.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const API = "https://api.supabase.com/v1";

const env = (name, { required = true } = {}) => {
  const value = process.env[name]?.trim();
  if (!value && required) fail(`Variable ${name} manquante dans .env.`);
  return value || null;
};

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const origin = (url) => new URL(url).origin;
const mask = (value) => (value ? `${"•".repeat(8)} (${value.length} caractères)` : "—");

const token = env("SUPABASE_ACCESS_TOKEN");
const ref = env("SUPABASE_PROJECT_ID");
const siteUrl = origin(env("SITE_PUBLIC_URL"));
const adminUrl = origin(env("ADMIN_URL"));
const extraOrigins = (env("EXTRA_ALLOWED_ORIGINS", { required: false }) ?? "").split(",").map((value) => value.trim()).filter(Boolean);
const resendKey = env("RESEND_API_KEY", { required: false });
const emailFrom = env("EMAIL_FROM", { required: false });
const notifyTo = env("NOTIFICATION_EMAIL_TO", { required: false });

if (resendKey && (!emailFrom || !notifyTo)) fail("Avec RESEND_API_KEY, renseignez aussi EMAIL_FROM et NOTIFICATION_EMAIL_TO.");
if (/^sb_secret_|service_role/.test(token)) fail("SUPABASE_ACCESS_TOKEN doit être un jeton personnel (sbp_…), pas une clé de projet.");

async function api(method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) fail(`${method} ${path} → HTTP ${response.status} : ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

const template = (name) => readFileSync(resolve(root, "supabase/templates", `${name}.html`), "utf8");

// Origines autorisées par les Edge Functions : domaine (www + apex), back-office, et suppléments.
const siteHost = new URL(siteUrl).hostname;
const apex = siteHost.startsWith("www.") ? `https://${siteHost.slice(4)}` : null;
const allowedOrigins = [...new Set([siteUrl, apex, adminUrl, ...extraOrigins].filter(Boolean))];

// --- Auth --------------------------------------------------------------------
const auth = {
  site_url: adminUrl,
  uri_allow_list: [`${adminUrl}/**`, ...extraOrigins.map((value) => `${value}/**`)].join(","),
  disable_signup: true,
  external_email_enabled: true,
  mailer_autoconfirm: false,
  mailer_secure_email_change_enabled: true,
  password_min_length: 12,
  password_required_characters: "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789",
  mailer_subjects_invite: "Votre accès au back-office UPCOM",
  mailer_templates_invite_content: template("invite"),
  mailer_subjects_recovery: "Réinitialisation de votre mot de passe UPCOM",
  mailer_templates_recovery_content: template("recovery"),
  mailer_subjects_email_change: "Confirmez votre nouvelle adresse e-mail",
  mailer_templates_email_change_content: template("email_change"),
  mailer_subjects_confirmation: "Confirmez votre adresse e-mail",
  mailer_templates_confirmation_content: template("confirmation"),
};

if (resendKey) {
  const sender = emailFrom.match(/<([^>]+)>/)?.[1] ?? emailFrom;
  const senderName = emailFrom.includes("<") ? emailFrom.split("<")[0].trim().replace(/^"|"$/g, "") : "UPCOM";
  Object.assign(auth, {
    smtp_host: "smtp.resend.com",
    smtp_port: "465",
    smtp_user: "resend",
    smtp_pass: resendKey,
    smtp_admin_email: sender,
    smtp_sender_name: senderName,
    // Avec un SMTP personnel, la limite d'envoi peut être relevée (défaut Supabase très bas).
    rate_limit_email_sent: 100,
  });
}

// --- Secrets des Edge Functions ----------------------------------------------
const secrets = [
  { name: "ALLOWED_ORIGINS", value: allowedOrigins.join(",") },
  { name: "SITE_PUBLIC_URL", value: siteUrl },
  { name: "ADMIN_APP_URL", value: adminUrl },
  { name: "ADMIN_INVITE_REDIRECT_URL", value: `${adminUrl}/auth/accept-invite` },
];
if (resendKey) {
  secrets.push({ name: "RESEND_API_KEY", value: resendKey }, { name: "EMAIL_FROM", value: emailFrom }, { name: "NOTIFICATION_EMAIL_TO", value: notifyTo });
}
const SECRET_NAMES = new Set(["RESEND_API_KEY"]);

// --- Exécution ---------------------------------------------------------------
console.log(`\nProjet ${ref} — ${APPLY ? "APPLICATION" : "APERÇU (ajoutez --apply pour appliquer)"}\n`);

const current = await api("GET", `/projects/${ref}/config/auth`);

// Offre gratuite : les modèles d'e-mails ne sont modifiables qu'avec un SMTP personnel.
if (!resendKey && !current.smtp_host) {
  for (const key of Object.keys(auth)) {
    if (key.startsWith("mailer_templates_") || key.startsWith("mailer_subjects_")) delete auth[key];
  }
  console.log("ℹ Modèles d'e-mails ignorés : ils nécessitent un SMTP personnel (RESEND_API_KEY).\n");
}

console.log("Auth");
for (const [key, value] of Object.entries(auth)) {
  const before = current[key];
  const isTemplate = key.startsWith("mailer_templates_");
  const isSecret = key === "smtp_pass";
  const changed = String(before ?? "") !== String(value);
  const shown = isSecret ? mask(value) : isTemplate ? `modèle UPCOM (${value.length} caractères)` : JSON.stringify(value);
  console.log(`  ${changed ? "≠" : "="} ${key.padEnd(40)} ${shown}${changed && !isTemplate && !isSecret ? `   (actuel : ${JSON.stringify(before ?? null)})` : ""}`);
}
if (!resendKey) console.log("  ℹ SMTP non configuré : ajoutez RESEND_API_KEY / EMAIL_FROM / NOTIFICATION_EMAIL_TO pour envoyer de vrais e-mails.");

console.log("\nSecrets des Edge Functions");
for (const secret of secrets) console.log(`  → ${secret.name.padEnd(28)} ${SECRET_NAMES.has(secret.name) ? mask(secret.value) : secret.value}`);

if (!APPLY) {
  console.log("\nAperçu uniquement. Relancez avec --apply pour appliquer.\n");
  process.exit(0);
}

await api("PATCH", `/projects/${ref}/config/auth`, auth);
console.log("\n✓ Configuration Auth appliquée");
await api("POST", `/projects/${ref}/secrets`, secrets);
console.log("✓ Secrets des Edge Functions appliqués (pris en compte aux prochains appels)");
console.log("\nTerminé.\n");
