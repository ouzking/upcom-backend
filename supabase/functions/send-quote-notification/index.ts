/**
 * POST /functions/v1/send-quote-notification — INTERNE / BACK-OFFICE
 *
 * Envoie (ou renvoie) l'e-mail de notification d'une demande de devis.
 * Body : { "id": "<uuid>", "force"?: boolean } ou payload Database Webhook.
 * Auth : en-tête x-webhook-secret OU JWT d'un membre ayant `quotes.view`.
 */
import { serveNotificationEndpoint } from "../_shared/notification-endpoint.ts";
import { sendQuoteNotification } from "../_shared/notifications.ts";

serveNotificationEndpoint({
  name: "send-quote-notification",
  staffPermission: "quotes.view",
  send: sendQuoteNotification,
});
