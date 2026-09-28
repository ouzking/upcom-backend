import { escapeHtml } from "./email.ts";

// Charte UPCOM
const BLUE = "#013592";
const BLUE_LIGHT = "#0172E7";
const ORANGE = "#FD8E03";

type Field = [label: string, value: string | null | undefined];

/** Cadre commun : en-tête dégradé bleu, liseré orange, carte blanche. */
function layout(title: string, body: string, footer: string): string {
  return `<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:10px;overflow:hidden">
          <tr><td style="background:${BLUE};background-image:linear-gradient(90deg,${BLUE},${BLUE_LIGHT});padding:20px 24px;color:#fff">
            <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.85">UPCOM AGENCY &amp; SERVICES</div>
            <div style="font-size:20px;font-weight:700;margin-top:4px">${escapeHtml(title)}</div>
          </td></tr>
          <tr><td style="height:4px;background:${ORANGE}"></td></tr>
          <tr><td style="padding:24px;color:#111;font-size:15px;line-height:1.55">${body}</td></tr>
        </table>
        <p style="color:#888;font-size:12px;line-height:1.5;margin-top:12px;max-width:600px">${footer}</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

function fieldRows(fields: Field[]): string {
  return fields
    .filter(([, value]) => value)
    .map(([label, value]) => `
      <tr>
        <td style="padding:6px 12px 6px 0;color:#555;font-weight:600;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
        <td style="padding:6px 0;color:#111">${escapeHtml(String(value))}</td>
      </tr>`)
    .join("");
}

const fieldLines = (fields: Field[]) => fields.filter(([, value]) => value).map(([label, value]) => `${label} : ${value}`);

// ---------------------------------------------------------------------------
// Notification interne (équipe UPCOM)
// ---------------------------------------------------------------------------

export interface NotificationTemplate {
  title: string;
  intro: string;
  fields: Field[];
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

/** E-mail interne de notification (HTML + texte brut). Toutes les valeurs sont échappées. */
export function renderNotification(template: NotificationTemplate): { html: string; text: string } {
  const action = template.actionUrl
    ? `<p style="margin:24px 0 0">
         <a href="${escapeHtml(template.actionUrl)}"
            style="display:inline-block;background:${ORANGE};color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">
           ${escapeHtml(template.actionLabel ?? "Ouvrir le back-office")}
         </a>
       </p>`
    : "";

  const html = layout(
    template.title,
    `<p style="margin:0 0 16px">${escapeHtml(template.intro)}</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${fieldRows(template.fields)}</table>
     <div style="margin-top:20px;padding:16px;background:#f4f6fb;border-left:4px solid ${ORANGE};white-space:pre-wrap;font-size:14px">${escapeHtml(template.message)}</div>
     ${action}`,
    "Notification automatique — ne pas transférer : contient des données personnelles.",
  );

  const text = [
    template.title,
    "",
    template.intro,
    "",
    ...fieldLines(template.fields),
    "",
    template.message,
    ...(template.actionUrl ? ["", `${template.actionLabel ?? "Back-office"} : ${template.actionUrl}`] : []),
  ].join("\n");

  return { html, text };
}

// ---------------------------------------------------------------------------
// Accusé de réception (prospect / visiteur)
// ---------------------------------------------------------------------------

export interface CompanyContact {
  companyName: string;
  address: string | null;
  phones: string[];
  email: string | null;
  websiteUrl: string | null;
}

export interface AcknowledgementTemplate {
  title: string;
  recipientName: string;
  paragraphs: string[];
  /** Rappel de la demande (sans le message complet). */
  summary: Field[];
  contact: CompanyContact;
}

/** E-mail envoyé au visiteur pour confirmer la bonne réception de sa demande. */
export function renderAcknowledgement(template: AcknowledgementTemplate): { html: string; text: string } {
  const { contact } = template;
  const contactFields: Field[] = [
    ["Adresse", contact.address],
    ["Téléphone", contact.phones.join(" · ") || null],
    ["E-mail", contact.email],
  ];
  const summary = fieldRows(template.summary);
  const website = contact.websiteUrl
    ? `<p style="margin:24px 0 0">
         <a href="${escapeHtml(contact.websiteUrl)}"
            style="display:inline-block;background:${ORANGE};color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">
           Découvrir nos réalisations
         </a>
       </p>`
    : "";

  const html = layout(
    template.title,
    `<p style="margin:0 0 16px">Bonjour ${escapeHtml(template.recipientName)},</p>
     ${template.paragraphs.map((p) => `<p style="margin:0 0 14px">${escapeHtml(p)}</p>`).join("")}
     ${summary ? `<div style="margin:20px 0 0;padding:16px;background:#f4f6fb;border-left:4px solid ${ORANGE}">
        <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${BLUE};font-weight:700;margin-bottom:8px">Récapitulatif</div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${summary}</table>
      </div>` : ""}
     <p style="margin:20px 0 0">Bien cordialement,<br><strong style="color:${BLUE}">L'équipe ${escapeHtml(contact.companyName)}</strong></p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:13px;margin-top:12px;color:#555">${fieldRows(contactFields)}</table>
     ${website}`,
    "Vous recevez cet e-mail car une demande a été envoyée depuis notre site avec votre adresse. " +
      "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.",
  );

  const text = [
    `Bonjour ${template.recipientName},`,
    "",
    ...template.paragraphs.flatMap((p) => [p, ""]),
    ...(template.summary.some(([, v]) => v) ? ["Récapitulatif", ...fieldLines(template.summary), ""] : []),
    "Bien cordialement,",
    `L'équipe ${contact.companyName}`,
    ...fieldLines(contactFields),
    ...(contact.websiteUrl ? [contact.websiteUrl] : []),
  ].join("\n");

  return { html, text };
}
