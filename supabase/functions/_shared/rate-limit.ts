import type { SupabaseClient } from "./deps.ts";
import { databaseError, HttpError } from "./http.ts";

export interface RateLimitOptions {
  max: number;
  windowMinutes: number;
}

/**
 * Limite le nombre de soumissions par IP (hashée) sur une fenêtre glissante,
 * en s'appuyant sur les lignes déjà enregistrées (index ip_hash, created_at).
 */
export async function enforceRateLimit(
  admin: SupabaseClient,
  table: "quote_requests" | "contact_messages",
  ipHash: string | null,
  options: RateLimitOptions,
): Promise<void> {
  if (!ipHash) return;

  const since = new Date(Date.now() - options.windowMinutes * 60_000).toISOString();
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if (error) throw databaseError(`rate-limit ${table}`, error);
  if ((count ?? 0) >= options.max) {
    throw new HttpError(
      429,
      "rate_limited",
      "Vous avez envoyé plusieurs demandes récemment. Veuillez réessayer dans quelques minutes.",
    );
  }
}
