import { getEnv, requireEnv } from "./env.ts";
import { HttpError } from "./http.ts";

const encoder = new TextEncoder();

/** IP du client telle que transmise par la passerelle Supabase. */
export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip");
}

/** Empreinte SHA-256 salée de l'IP : permet le rate-limit sans stocker l'IP. */
export async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const salt = requireEnv("IP_HASH_SALT");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${salt}:${ip}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Comparaison de secrets en temps constant. */
export function safeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

/** Vrai si la requête porte le secret partagé des webhooks internes. */
export function hasValidWebhookSecret(req: Request): boolean {
  const expected = getEnv("NOTIFICATION_WEBHOOK_SECRET");
  const received = req.headers.get("x-webhook-secret");
  return Boolean(expected && received && safeEqual(received, expected));
}

/**
 * Vérification Cloudflare Turnstile. Désactivée si TURNSTILE_SECRET_KEY est
 * absente (développement local) ; obligatoire dès qu'elle est configurée.
 */
export async function verifyCaptcha(token: string | undefined, ip: string | null): Promise<void> {
  const secret = getEnv("TURNSTILE_SECRET_KEY");
  if (!secret) return;
  if (!token) {
    throw new HttpError(400, "captcha_failed", "La vérification anti-robot est requise.");
  }

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(`Turnstile a répondu ${response.status}`);
  }
  const result = (await response.json()) as { success?: boolean };
  if (result.success !== true) {
    throw new HttpError(400, "captcha_failed", "La vérification anti-robot a échoué. Veuillez réessayer.");
  }
}

/** Tronque une valeur optionnelle (ex. user-agent) avant stockage. */
export function truncate(value: string | null, max: number): string | null {
  return value ? value.slice(0, max) : null;
}
