/**
 * POST /functions/v1/submit-contact-message — PUBLIC
 *
 * Enregistre un message du formulaire de contact (même chaîne de sécurité que
 * submit-quote-request : validation, honeypot, Turnstile, rate-limit) puis
 * notifie l'équipe en arrière-plan.
 */
import { runInBackground } from "../_shared/background.ts";
import type { SubmitContactMessageResult } from "../_shared/contracts.ts";
import { databaseError, ok, readJsonBody, serve } from "../_shared/http.ts";
import { sendContactNotification } from "../_shared/notifications.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { getClientIp, hashIp, truncate, verifyCaptcha } from "../_shared/security.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { contactMessageSchema, parsePayload } from "../_shared/validation.ts";

serve({
  name: "submit-contact-message",
  methods: ["POST"],
  handler: async (ctx) => {
    const input = parsePayload(contactMessageSchema, await readJsonBody(ctx.req));

    if (input.website) {
      return ok<SubmitContactMessageResult>(ctx, { id: crypto.randomUUID() }, 201);
    }

    const ip = getClientIp(ctx.req);
    await verifyCaptcha(input.captcha_token, ip);

    const admin = createAdminClient();
    const ipHash = await hashIp(ip);
    await enforceRateLimit(admin, "contact_messages", ipHash, { max: 5, windowMinutes: 15 });

    const { data, error } = await admin
      .from("contact_messages")
      .insert({
        name: input.name,
        email: input.email,
        phone: input.phone,
        subject: input.subject,
        message: input.message,
        ip_hash: ipHash,
        user_agent: truncate(ctx.req.headers.get("user-agent"), 500),
      })
      .select("id")
      .single<{ id: string }>();
    if (error) throw databaseError("insert contact_message", error);

    runInBackground("send-contact-notification", () => sendContactNotification(admin, data.id));

    return ok<SubmitContactMessageResult>(ctx, { id: data.id }, 201);
  },
});
