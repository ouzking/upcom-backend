import type { SendNotificationResult } from "./contracts.ts";
import type { SupabaseClient } from "./deps.ts";
import { sendEmail } from "./email.ts";
import { getEnv, getEnvList } from "./env.ts";
import { databaseError, HttpError } from "./http.ts";
import { type CompanyContact, renderAcknowledgement, renderNotification } from "./templates.ts";

interface NotifyOptions {
  /** Renvoyer même si notified_at est déjà renseigné. */
  force?: boolean;
}

interface QuoteRow {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  budget: string | null;
  deadline: string | null;
  message: string;
  created_at: string;
  notified_at: string | null;
  service: { title: string } | null;
}

interface ContactRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  created_at: string;
  notified_at: string | null;
}

function recipients(specificVariable: string): string[] {
  const specific = getEnvList(specificVariable);
  return specific.length > 0 ? specific : getEnvList("NOTIFICATION_EMAIL_TO");
}

function adminUrl(): string | undefined {
  return getEnv("ADMIN_APP_URL");
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { timeZone: "Africa/Dakar", dateStyle: "long", timeStyle: "short" });

async function markNotified(admin: SupabaseClient, table: "quote_requests" | "contact_messages", id: string) {
  const { error } = await admin.from(table).update({ notified_at: new Date().toISOString() }).eq("id", id);
  if (error) throw databaseError(`mark ${table} notified`, error);
}

/**
 * Notifie l'équipe commerciale d'une demande de devis. Idempotent : une demande
 * déjà notifiée n'est pas renvoyée, sauf `force`. Les données sont relues en
 * base (on ne fait jamais confiance au contenu d'un webhook).
 */
export async function sendQuoteNotification(
  admin: SupabaseClient,
  id: string,
  options: NotifyOptions = {},
): Promise<SendNotificationResult> {
  const { data: quote, error } = await admin
    .from("quote_requests")
    .select("id, name, company, email, phone, budget, deadline, message, created_at, notified_at, service:services(title)")
    .eq("id", id)
    .maybeSingle<QuoteRow>();

  if (error) throw databaseError("load quote_request", error);
  if (!quote) throw new HttpError(404, "not_found", "Demande de devis introuvable.");
  if (quote.notified_at && !options.force) return { status: "already_notified" };

  const { html, text } = renderNotification({
    title: "Nouvelle demande de devis",
    intro: `Une demande de devis a été envoyée depuis le site le ${formatDate(quote.created_at)}.`,
    fields: [
      ["Nom", quote.name],
      ["Entreprise", quote.company],
      ["E-mail", quote.email],
      ["Téléphone", quote.phone],
      ["Service", quote.service?.title],
      ["Budget", quote.budget],
      ["Échéance souhaitée", quote.deadline],
    ],
    message: quote.message,
    actionUrl: adminUrl(),
    actionLabel: "Traiter la demande",
  });

  const result = await sendEmail({
    to: recipients("QUOTE_NOTIFICATION_EMAIL_TO"),
    subject: `[UPCOM] Demande de devis — ${quote.company ?? quote.name}`,
    html,
    text,
    replyTo: quote.email,
  });
  if (!result.sent) return { status: "skipped", reason: result.reason };

  await markNotified(admin, "quote_requests", quote.id);
  return { status: "sent" };
}

/** Notifie l'équipe d'un nouveau message de contact. Même logique d'idempotence. */
export async function sendContactNotification(
  admin: SupabaseClient,
  id: string,
  options: NotifyOptions = {},
): Promise<SendNotificationResult> {
  const { data: contact, error } = await admin
    .from("contact_messages")
    .select("id, name, email, phone, subject, message, created_at, notified_at")
    .eq("id", id)
    .maybeSingle<ContactRow>();

  if (error) throw databaseError("load contact_message", error);
  if (!contact) throw new HttpError(404, "not_found", "Message introuvable.");
  if (contact.notified_at && !options.force) return { status: "already_notified" };

  const { html, text } = renderNotification({
    title: "Nouveau message de contact",
    intro: `Un message a été envoyé depuis le formulaire de contact le ${formatDate(contact.created_at)}.`,
    fields: [
      ["Nom", contact.name],
      ["E-mail", contact.email],
      ["Téléphone", contact.phone],
      ["Objet", contact.subject],
    ],
    message: contact.message,
    actionUrl: adminUrl(),
    actionLabel: "Voir le message",
  });

  const result = await sendEmail({
    to: recipients("CONTACT_NOTIFICATION_EMAIL_TO"),
    subject: `[UPCOM] Contact — ${contact.subject ?? contact.name}`,
    html,
    text,
    replyTo: contact.email,
  });
  if (!result.sent) return { status: "skipped", reason: result.reason };

  await markNotified(admin, "contact_messages", contact.id);
  return { status: "sent" };
}

// ---------------------------------------------------------------------------
// Accusé de réception envoyé au visiteur
// ---------------------------------------------------------------------------

interface SiteSettingsRow {
  company_name: string;
  address: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  email: string | null;
}

/** Coordonnées publiques d'UPCOM, lues dans site_settings (source unique, modifiable dans l'admin). */
async function loadCompanyContact(admin: SupabaseClient): Promise<CompanyContact> {
  const { data, error } = await admin
    .from("site_settings")
    .select("company_name, address, phone_primary, phone_secondary, email")
    .eq("id", 1)
    .maybeSingle<SiteSettingsRow>();
  if (error) throw databaseError("load site_settings", error);
  return {
    companyName: data?.company_name ?? "UPCOM AGENCY & SERVICES",
    address: data?.address ?? null,
    phones: [data?.phone_primary, data?.phone_secondary].filter((phone): phone is string => Boolean(phone)),
    email: data?.email ?? null,
    websiteUrl: getEnv("SITE_PUBLIC_URL") ?? null,
  };
}

export interface AcknowledgementInput {
  kind: "quote" | "contact";
  to: string;
  name: string;
  /** Service demandé (devis) ou objet (contact). */
  topic: string | null;
  deadline?: string | null;
}

/**
 * Confirme au visiteur la bonne réception de sa demande. Désactivable via
 * SEND_REQUESTER_ACKNOWLEDGEMENT=false. Le rate-limit par IP et Turnstile
 * empêchent d'utiliser le formulaire pour inonder une adresse tierce.
 */
export async function sendRequesterAcknowledgement(
  admin: SupabaseClient,
  input: AcknowledgementInput,
): Promise<void> {
  if (getEnv("SEND_REQUESTER_ACKNOWLEDGEMENT") === "false") return;

  const contact = await loadCompanyContact(admin);
  const isQuote = input.kind === "quote";
  const { html, text } = renderAcknowledgement({
    title: isQuote ? "Votre demande de devis est bien reçue" : "Votre message est bien reçu",
    recipientName: input.name,
    paragraphs: isQuote
      ? [
        `Merci pour l'intérêt que vous portez à ${contact.companyName}. Nous avons bien reçu votre demande de devis.`,
        "Un membre de notre équipe l'étudie et reviendra vers vous rapidement pour échanger sur votre projet.",
      ]
      : [
        `Merci d'avoir contacté ${contact.companyName}. Nous avons bien reçu votre message.`,
        "Notre équipe vous répondra dans les meilleurs délais.",
      ],
    summary: isQuote
      ? [["Service", input.topic], ["Échéance souhaitée", input.deadline ?? null]]
      : [["Objet", input.topic]],
    contact,
  });

  await sendEmail({
    to: [input.to],
    subject: isQuote ? `${contact.companyName} — Demande de devis reçue` : `${contact.companyName} — Message reçu`,
    html,
    text,
    replyTo: contact.email ?? undefined,
  });
}
