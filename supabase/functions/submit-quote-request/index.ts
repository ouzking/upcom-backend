/**
 * POST /functions/v1/submit-quote-request — PUBLIC
 *
 * Enregistre une demande de devis depuis le site public :
 *   1. validation stricte (zod, champs inconnus refusés)
 *   2. honeypot anti-bot + Cloudflare Turnstile (si configuré)
 *   3. rate-limit par IP hashée
 *   4. vérification que le service choisi est publié
 *   5. insertion avec la service_role (aucun droit d'écriture côté anon)
 *   6. notification e-mail de l'équipe en arrière-plan
 */
import { runInBackground } from "../_shared/background.ts";
import type { SubmitQuoteRequestResult } from "../_shared/contracts.ts";
import { databaseError, HttpError, ok, readJsonBody, serve } from "../_shared/http.ts";
import { sendQuoteNotification } from "../_shared/notifications.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { getClientIp, hashIp, truncate, verifyCaptcha } from "../_shared/security.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { parsePayload, quoteRequestSchema } from "../_shared/validation.ts";

serve({
  name: "submit-quote-request",
  methods: ["POST"],
  handler: async (ctx) => {
    const input = parsePayload(quoteRequestSchema, await readJsonBody(ctx.req));

    // Honeypot rempli : on simule un succès sans rien enregistrer.
    if (input.website) {
      return ok<SubmitQuoteRequestResult>(ctx, { id: crypto.randomUUID() }, 201);
    }

    const ip = getClientIp(ctx.req);
    await verifyCaptcha(input.captcha_token, ip);

    const admin = createAdminClient();
    const ipHash = await hashIp(ip);
    await enforceRateLimit(admin, "quote_requests", ipHash, { max: 3, windowMinutes: 15 });

    if (input.service_id) {
      const { data: service, error } = await admin
        .from("services")
        .select("id")
        .eq("id", input.service_id)
        .eq("status", "published")
        .maybeSingle<{ id: string }>();
      if (error) throw databaseError("check service", error);
      if (!service) {
        throw new HttpError(422, "validation_error", "Certaines informations sont invalides.", [
          { field: "service_id", message: "Le service sélectionné n'existe pas." },
        ]);
      }
    }

    const { data, error } = await admin
      .from("quote_requests")
      .insert({
        name: input.name,
        company: input.company,
        email: input.email,
        phone: input.phone,
        service_id: input.service_id,
        budget: input.budget,
        deadline: input.deadline,
        message: input.message,
        ip_hash: ipHash,
        user_agent: truncate(ctx.req.headers.get("user-agent"), 500),
      })
      .select("id")
      .single<{ id: string }>();
    if (error) throw databaseError("insert quote_request", error);

    runInBackground("send-quote-notification", () => sendQuoteNotification(admin, data.id));

    return ok<SubmitQuoteRequestResult>(ctx, { id: data.id }, 201);
  },
});
