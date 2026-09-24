import { escapeHtml } from "./email.ts";

// Charte UPCOM
const BLUE = "#013592";
const BLUE_LIGHT = "#0172E7";
const ORANGE = "#FD8E03";

export interface NotificationTemplate {
  title: string;
  intro: string;
  fields: Array<[label: string, value: string | null | undefined]>;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

/** E-mail interne de notification (HTML + texte brut). Toutes les valeurs sont échappées. */
export function renderNotification(template: NotificationTemplate): { html: string; text: string } {
  const rows = template.fields
    .filter(([, value]) => value)
    .map(([label, value]) => `
      <tr>
        <td style="padding:6px 12px 6px 0;color:#555;font-weight:600;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
        <td style="padding:6px 0;color:#111">${escapeHtml(String(value))}</td>
      </tr>`)
    .join("");

  const action = template.actionUrl
    ? `<p style="margin:24px 0 0">
         <a href="${escapeHtml(template.actionUrl)}"
            style="display:inline-block;background:${ORANGE};color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">
           ${escapeHtml(template.actionLabel ?? "Ouvrir le back-office")}
         </a>
       </p>`
    : "";

  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:10px;overflow:hidden">
          <tr><td style="background:${BLUE};background-image:linear-gradient(90deg,${BLUE},${BLUE_LIGHT});padding:20px 24px;color:#fff">
            <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.85">UPCOM AGENCY &amp; SERVICES</div>
            <div style="font-size:20px;font-weight:700;margin-top:4px">${escapeHtml(template.title)}</div>
          </td></tr>
          <tr><td style="height:4px;background:${ORANGE}"></td></tr>
          <tr><td style="padding:24px">
            <p style="margin:0 0 16px;color:#111">${escapeHtml(template.intro)}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}</table>
            <div style="margin-top:20px;padding:16px;background:#f4f6fb;border-left:4px solid ${ORANGE};white-space:pre-wrap;color:#111;font-size:14px">${escapeHtml(template.message)}</div>
            ${action}
          </td></tr>
        </table>
        <p style="color:#888;font-size:12px;margin-top:12px">Notification automatique — ne pas transférer : contient des données personnelles.</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    template.title,
    "",
    template.intro,
    "",
    ...template.fields.filter(([, value]) => value).map(([label, value]) => `${label} : ${value}`),
    "",
    template.message,
    ...(template.actionUrl ? ["", `${template.actionLabel ?? "Back-office"} : ${template.actionUrl}`] : []),
  ].join("\n");

  return { html, text };
}
