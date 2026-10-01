/**
 * POST /functions/v1/trigger-site-rebuild — BACK-OFFICE (toute permission de contenu)
 *
 * Relance la génération du site public via un build hook Netlify, pour que
 * les nouveaux contenus aient leur page HTML pré-générée et leur entrée dans
 * le sitemap. L'URL du hook est un secret (NETLIFY_BUILD_HOOK_URL) : quiconque
 * la connaît peut déclencher des builds, elle ne doit donc jamais être exposée
 * au navigateur.
 */
import { requireAnyPermission } from "../_shared/auth.ts";
import type { AppPermissionName, TriggerSiteRebuildResult } from "../_shared/contracts.ts";
import { getEnv } from "../_shared/env.ts";
import { ok, serve } from "../_shared/http.ts";

const CONTENT_PERMISSIONS: readonly AppPermissionName[] = [
  "services.manage",
  "projects.manage",
  "articles.manage",
  "events.manage",
  "team.manage",
  "testimonials.manage",
  "settings.manage",
];

/** Anti-rafale par instance : Netlify regroupe déjà les builds en file d'attente. */
const MIN_INTERVAL_MS = 60_000;
let lastTriggeredAt = 0;

serve({
  name: "trigger-site-rebuild",
  methods: ["POST"],
  handler: async (ctx) => {
    const caller = await requireAnyPermission(ctx.req, CONTENT_PERMISSIONS);

    const hookUrl = getEnv("NETLIFY_BUILD_HOOK_URL");
    if (!hookUrl || !hookUrl.startsWith("https://api.netlify.com/build_hooks/")) {
      return ok<TriggerSiteRebuildResult>(ctx, { status: "skipped", reason: "not_configured" });
    }
    if (Date.now() - lastTriggeredAt < MIN_INTERVAL_MS) {
      return ok<TriggerSiteRebuildResult>(ctx, { status: "skipped", reason: "recently_triggered" });
    }

    const url = new URL(hookUrl);
    url.searchParams.set("trigger_title", "Mise à jour depuis le back-office UPCOM");
    const response = await fetch(url, { method: "POST", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      throw new Error(`Netlify build hook a répondu ${response.status}`);
    }
    lastTriggeredAt = Date.now();

    console.log(JSON.stringify({ level: "info", function: "trigger-site-rebuild", requested_by: caller.userId }));
    return ok<TriggerSiteRebuildResult>(ctx, { status: "triggered" });
  },
});
