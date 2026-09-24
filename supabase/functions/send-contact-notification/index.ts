/**
 * POST /functions/v1/send-contact-notification — INTERNE / BACK-OFFICE
 *
 * Envoie (ou renvoie) l'e-mail de notification d'un message de contact.
 * Body : { "id": "<uuid>", "force"?: boolean } ou payload Database Webhook.
 * Auth : en-tête x-webhook-secret OU JWT d'un membre ayant `contacts.view`.
 */
import { serveNotificationEndpoint } from "../_shared/notification-endpoint.ts";
import { sendContactNotification } from "../_shared/notifications.ts";

serveNotificationEndpoint({
  name: "send-contact-notification",
  staffPermission: "contacts.view",
  send: sendContactNotification,
});
