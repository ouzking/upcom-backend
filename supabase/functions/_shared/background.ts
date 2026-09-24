// Fourni par le runtime Supabase Edge (absent des types Deno standard).
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

/**
 * Exécute une tâche après l'envoi de la réponse HTTP (ex. e-mail de
 * notification) : le visiteur n'attend pas l'envoi et un échec d'e-mail
 * n'invalide pas une demande déjà enregistrée.
 */
export function runInBackground(label: string, task: () => Promise<unknown>): void {
  const guarded = task().catch((error) => {
    console.error(JSON.stringify({
      level: "error",
      task: label,
      message: error instanceof Error ? error.message : String(error),
    }));
  });
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime) {
    EdgeRuntime.waitUntil(guarded);
  }
}
