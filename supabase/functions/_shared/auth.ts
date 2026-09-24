import type { AppPermissionName, AppRoleName } from "./contracts.ts";
import { HttpError } from "./http.ts";
import { createUserClient } from "./supabase.ts";

export interface StaffAccess {
  userId: string;
  role: AppRoleName;
  permissions: AppPermissionName[];
}

/**
 * Identifie le membre du back-office à l'origine de la requête.
 * Les droits sont lus via la RPC `get_my_access` exécutée AVEC le JWT de
 * l'appelant : la source de vérité reste la base (profiles + role_permissions).
 */
export async function getStaffAccess(req: Request): Promise<StaffAccess | null> {
  const header = req.headers.get("authorization");
  if (!header || !/^bearer\s+\S+$/i.test(header)) return null;

  const client = createUserClient(header);
  const { data: userData, error: userError } = await client.auth.getUser(header.replace(/^bearer\s+/i, ""));
  if (userError || !userData.user) return null;

  const { data, error } = await client
    .rpc("get_my_access")
    .maybeSingle<{ role: AppRoleName; permissions: AppPermissionName[] }>();
  if (error || !data) return null;

  return { userId: userData.user.id, role: data.role, permissions: data.permissions };
}

/** Exige un membre actif du back-office détenant `permission` (401 / 403 sinon). */
export async function requirePermission(
  req: Request,
  permission: AppPermissionName,
): Promise<StaffAccess> {
  const access = await getStaffAccess(req);
  if (!access) {
    throw new HttpError(401, "unauthorized", "Authentification requise.");
  }
  if (!access.permissions.includes(permission)) {
    throw new HttpError(403, "forbidden", "Vous n'avez pas les droits nécessaires pour cette action.");
  }
  return access;
}
