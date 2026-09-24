import { requirePermission } from "./auth.ts";
import type { AppPermissionName, SendNotificationResult } from "./contracts.ts";
import type { SupabaseClient } from "./deps.ts";
import { HttpError, ok, readJsonBody, serve } from "./http.ts";
import { hasValidWebhookSecret } from "./security.ts";
import { createAdminClient } from "./supabase.ts";
import { notificationPayloadSchema, parsePayload } from "./validation.ts";

interface NotificationEndpointOptions {
  name: string;
  /** Permission exigée pour un appel depuis le back-office (renvoi manuel). */
  staffPermission: AppPermissionName;
  send: (admin: SupabaseClient, id: string, options: { force: boolean }) => Promise<SendNotificationResult>;
}

/**
 * Endpoint de notification partagé par send-quote-notification et
 * send-contact-notification. Deux appelants autorisés :
 *   * Database Webhook / appel serveur : en-tête `x-webhook-secret` valide ;
 *   * membre du back-office (JWT) détenant `staffPermission` — seul autorisé
 *     à forcer un renvoi (`force: true`).
 */
export function serveNotificationEndpoint(options: NotificationEndpointOptions): void {
  serve({
    name: options.name,
    methods: ["POST"],
    handler: async (ctx) => {
      const trusted = hasValidWebhookSecret(ctx.req);
      if (!trusted) {
        await requirePermission(ctx.req, options.staffPermission);
      }

      const payload = parsePayload(notificationPayloadSchema, await readJsonBody(ctx.req));

      // Database Webhook : seules les insertions déclenchent une notification.
      if (payload.type && payload.type !== "INSERT") {
        return ok<SendNotificationResult>(ctx, { status: "skipped", reason: "ignored_event" });
      }

      const id = payload.id ?? payload.record?.id;
      if (!id) {
        throw new HttpError(422, "validation_error", "Identifiant manquant.", [
          { field: "id", message: "L'identifiant est requis." },
        ]);
      }

      const force = !trusted && payload.force === true;
      const result = await options.send(createAdminClient(), id, { force });
      return ok<SendNotificationResult>(ctx, result);
    },
  });
}
