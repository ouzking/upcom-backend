/**
 * POST /functions/v1/cleanup-media — BACK-OFFICE (permission settings.manage)
 *
 * Images qui ne sont plus utilisées par aucun contenu (contenu supprimé, image
 * remplacée…). La détection est faite en base (public.list_orphan_media) ;
 * la suppression passe par l'API Storage pour retirer aussi les fichiers.
 *
 * Body : { "dry_run"?: boolean }  — true par défaut : liste sans supprimer.
 */
import { requirePermission } from "../_shared/auth.ts";
import type { CleanupMediaResult, OrphanMediaFile } from "../_shared/contracts.ts";
import { databaseError, ok, readJsonBody, serve } from "../_shared/http.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { cleanupMediaSchema, parsePayload } from "../_shared/validation.ts";

interface OrphanRow {
  bucket_id: string;
  name: string;
  size_bytes: number | null;
  created_at: string;
}

const BATCH_SIZE = 100;

serve({
  name: "cleanup-media",
  methods: ["POST"],
  handler: async (ctx) => {
    const caller = await requirePermission(ctx.req, "settings.manage");
    const input = parsePayload(cleanupMediaSchema, await readJsonBody(ctx.req));
    const dryRun = input.dry_run !== false;

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("list_orphan_media");
    if (error) throw databaseError("list_orphan_media", error);

    const rows = (data ?? []) as OrphanRow[];
    const files: OrphanMediaFile[] = rows.map((row) => ({
      bucket: row.bucket_id,
      path: row.name,
      size_bytes: row.size_bytes,
      created_at: row.created_at,
    }));
    const totalBytes = files.reduce((sum, file) => sum + (file.size_bytes ?? 0), 0);

    let deleted = 0;
    if (!dryRun) {
      const byBucket = new Map<string, string[]>();
      for (const file of files) {
        byBucket.set(file.bucket, [...(byBucket.get(file.bucket) ?? []), file.path]);
      }
      for (const [bucket, paths] of byBucket) {
        for (let i = 0; i < paths.length; i += BATCH_SIZE) {
          const { data: removed, error: removeError } = await admin.storage
            .from(bucket)
            .remove(paths.slice(i, i + BATCH_SIZE));
          if (removeError) throw new Error(`storage.remove ${bucket}: ${removeError.message}`);
          deleted += removed?.length ?? 0;
        }
      }
      console.log(JSON.stringify({
        level: "info",
        function: "cleanup-media",
        requested_by: caller.userId,
        deleted,
        total_bytes: totalBytes,
      }));
    }

    return ok<CleanupMediaResult>(ctx, { dry_run: dryRun, files, total_bytes: totalBytes, deleted });
  },
});
