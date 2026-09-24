/**
 * POST /functions/v1/admin-invite-user — BACK-OFFICE (permission users.manage)
 *
 * Les inscriptions publiques sont désactivées : les comptes du back-office
 * sont créés uniquement par invitation. Cette fonction envoie l'e-mail
 * d'invitation Supabase Auth puis attribue le rôle au profil créé.
 * L'Admin API Auth nécessite la service_role : elle ne peut donc pas être
 * appelée depuis upcom-admin directement.
 */
import { requirePermission } from "../_shared/auth.ts";
import type { AdminInviteUserResult } from "../_shared/contracts.ts";
import { getEnv } from "../_shared/env.ts";
import { databaseError, HttpError, ok, readJsonBody, serve } from "../_shared/http.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { inviteUserSchema, parsePayload } from "../_shared/validation.ts";

serve({
  name: "admin-invite-user",
  methods: ["POST"],
  handler: async (ctx) => {
    const caller = await requirePermission(ctx.req, "users.manage");
    const input = parsePayload(inviteUserSchema, await readJsonBody(ctx.req));

    if (input.role === "super_admin" && caller.role !== "super_admin") {
      throw new HttpError(403, "forbidden", "Seul un super_admin peut inviter un super_admin.");
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
      data: input.full_name ? { full_name: input.full_name } : undefined,
      redirectTo: getEnv("ADMIN_INVITE_REDIRECT_URL"),
    });
    if (error) {
      if (error.status === 422 || /already (been )?registered|exists/i.test(error.message)) {
        throw new HttpError(409, "conflict", "Un compte existe déjà avec cette adresse e-mail.");
      }
      throw new Error(`inviteUserByEmail: ${error.message}`);
    }

    // Le profil a été créé par le trigger on_auth_user_created ; on lui attribue le rôle.
    const { error: profileError } = await admin
      .from("profiles")
      .update({ role: input.role, ...(input.full_name ? { full_name: input.full_name } : {}) })
      .eq("id", data.user.id);
    if (profileError) throw databaseError("assign role", profileError);

    console.log(JSON.stringify({
      level: "info",
      function: "admin-invite-user",
      invited_by: caller.userId,
      user_id: data.user.id,
      role: input.role,
    }));

    return ok<AdminInviteUserResult>(ctx, { user_id: data.user.id, email: input.email, role: input.role }, 201);
  },
});
