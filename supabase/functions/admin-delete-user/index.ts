/**
 * POST /functions/v1/admin-delete-user — BACK-OFFICE (permission users.manage)
 *
 * Supprime définitivement un compte (Supabase Auth ; le profil suit en cascade,
 * les contenus et demandes liés sont conservés avec auteur / attribution vidés).
 * Garde-fous : pas de suppression de son propre compte, seul un super_admin
 * peut supprimer un super_admin, jamais le dernier super_admin actif.
 * Pour une simple suspension, préférer profiles.is_active = false.
 */
import { requirePermission } from "../_shared/auth.ts";
import type { AdminDeleteUserResult, AppRoleName } from "../_shared/contracts.ts";
import { databaseError, HttpError, ok, readJsonBody, serve } from "../_shared/http.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { deleteUserSchema, parsePayload } from "../_shared/validation.ts";

serve({
  name: "admin-delete-user",
  methods: ["POST"],
  handler: async (ctx) => {
    const caller = await requirePermission(ctx.req, "users.manage");
    const input = parsePayload(deleteUserSchema, await readJsonBody(ctx.req));

    if (input.user_id === caller.userId) {
      throw new HttpError(409, "conflict", "Vous ne pouvez pas supprimer votre propre compte.");
    }

    const admin = createAdminClient();
    const { data: target, error } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", input.user_id)
      .maybeSingle<{ id: string; role: AppRoleName | null }>();
    if (error) throw databaseError("load profile", error);
    if (!target) throw new HttpError(404, "not_found", "Utilisateur introuvable.");

    if (target.role === "super_admin") {
      if (caller.role !== "super_admin") {
        throw new HttpError(403, "forbidden", "Seul un super_admin peut supprimer un super_admin.");
      }
      const { count, error: countError } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin")
        .eq("is_active", true)
        .neq("id", target.id);
      if (countError) throw databaseError("count super_admins", countError);
      if (!count) {
        throw new HttpError(409, "conflict", "Impossible de supprimer le dernier super_admin actif.");
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(input.user_id);
    if (deleteError) {
      if (deleteError.status === 404) throw new HttpError(404, "not_found", "Utilisateur introuvable.");
      throw new Error(`deleteUser: ${deleteError.message}`);
    }

    console.log(JSON.stringify({
      level: "info",
      function: "admin-delete-user",
      deleted_by: caller.userId,
      user_id: input.user_id,
    }));

    return ok<AdminDeleteUserResult>(ctx, { user_id: input.user_id });
  },
});
