import type { StorageBucket } from "./constants.js";

/**
 * URL publique d'un fichier Storage. Les colonnes *_path stockent le chemin
 * dans le bucket (portable entre environnements), pas l'URL complète.
 * Équivalent de supabase.storage.from(bucket).getPublicUrl(path), sans client.
 */
export function getPublicStorageUrl(
  supabaseUrl: string,
  bucket: StorageBucket,
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

/**
 * Construit un chemin d'upload sûr et unique : "<dossier>/<horodatage>-<nom-nettoyé>.<ext>".
 * Ex. buildStoragePath("services/abc-uuid", "Affiche Été.JPG") → "services/abc-uuid/1727190000000-affiche-ete.jpg"
 */
export function buildStoragePath(folder: string, fileName: string, now: number = Date.now()): string {
  const dot = fileName.lastIndexOf(".");
  const rawBase = dot > 0 ? fileName.slice(0, dot) : fileName;
  const rawExt = dot > 0 ? fileName.slice(dot + 1) : "";
  const base = rawBase
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "fichier";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  return `${cleanFolder ? `${cleanFolder}/` : ""}${now}-${base}${ext ? `.${ext}` : ""}`;
}
