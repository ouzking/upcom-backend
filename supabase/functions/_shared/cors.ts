import { getEnvList } from "./env.ts";

const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type";

/**
 * Origines autorisées : variable ALLOWED_ORIGINS (liste séparée par des virgules,
 * ex. "https://upcom.sn,https://admin.upcom.sn"). "*" autorise tout (dev uniquement).
 * Une requête sans en-tête Origin (serveur à serveur, webhook) n'est pas concernée.
 */
export function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const allowed = getEnvList("ALLOWED_ORIGINS");
  return allowed.includes("*") || allowed.includes(origin);
}

export function corsHeaders(req: Request, methods: readonly string[]): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": [...methods, "OPTIONS"].join(", "),
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  const origin = req.headers.get("origin");
  if (origin && isOriginAllowed(req)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}
