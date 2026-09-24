/** Lit une variable d'environnement obligatoire (erreur explicite si absente). */
export function requireEnv(name: string): string {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

/** Lit une variable d'environnement optionnelle (chaîne vide = absente). */
export function getEnv(name: string): string | undefined {
  const value = Deno.env.get(name)?.trim();
  return value ? value : undefined;
}

/** Lit une liste séparée par des virgules. */
export function getEnvList(name: string): string[] {
  return (getEnv(name) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
