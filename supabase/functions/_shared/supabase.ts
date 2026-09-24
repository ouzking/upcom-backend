import { createClient, type SupabaseClient } from "./deps.ts";
import { requireEnv } from "./env.ts";

const serverAuthOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

/**
 * Client service_role : contourne la RLS. À n'utiliser que côté serveur, après
 * validation complète des entrées. SUPABASE_SERVICE_ROLE_KEY est injectée par
 * la plateforme et ne doit JAMAIS apparaître dans un frontend ou dans Git.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: serverAuthOptions,
  });
}

/** Client agissant avec les droits de l'utilisateur appelant (RLS appliquée). */
export function createUserClient(authorizationHeader: string): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    auth: serverAuthOptions,
    global: { headers: { Authorization: authorizationHeader } },
  });
}
