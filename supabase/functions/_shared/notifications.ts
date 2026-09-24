import type { SendNotificationResult } from "./contracts.ts";
import type { SupabaseClient } from "./deps.ts";
import { sendEmail } from "./email.ts";
import { getEnv, getEnvList } from "./env.ts";
import { databaseError, HttpError } from "./http.ts";
import { renderNotification } from "./templates.ts";

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
