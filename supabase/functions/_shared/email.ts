import { getEnv } from "./env.ts";

export interface EmailMessage {
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export type EmailResult = { sent: true; id: string } | { sent: false; reason: string };

/**
 * Envoi via l'API Resend (https://resend.com). La clé RESEND_API_KEY reste un
 * secret Edge Functions. Sans configuration, l'envoi est ignoré (dev local)
 * et la demande reste marquée « non notifiée » (notified_at NULL).
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = getEnv("RESEND_API_KEY");
  const from = getEnv("EMAIL_FROM");
  if (!apiKey || !from) {
    console.warn(JSON.stringify({ level: "warn", message: "E-mail non configuré (RESEND_API_KEY / EMAIL_FROM)." }));
    return { sent: false, reason: "email_not_configured" };
  }
  if (message.to.length === 0) {
    console.warn(JSON.stringify({ level: "warn", message: "Aucun destinataire de notification configuré." }));
    return { sent: false, reason: "no_recipient" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: message.to,
      subject: message.subject.replace(/[\r\n]+/g, " ").slice(0, 200),
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Resend a répondu ${response.status}: ${detail}`);
  }
  const result = (await response.json()) as { id?: string };
  return { sent: true, id: result.id ?? "" };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
