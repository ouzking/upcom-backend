/**
 * @upcom/supabase — types et constantes partagés par upcom-frontend et upcom-admin.
 *
 *   import { createClient } from "@supabase/supabase-js";
 *   import type { Database } from "@upcom/supabase";
 *   const supabase = createClient<Database>(url, publishableKey);
 */
export type { CompositeTypes, Database, Enums, Json, Tables, TablesInsert, TablesUpdate } from "./database.types.js";
export { Constants } from "./database.types.js";
export type * from "./models.js";
export * from "./constants.js";
export * from "./storage.js";
export type * from "../supabase/functions/_shared/contracts.js";

import type { AppPermissionName, AppRoleName } from "../supabase/functions/_shared/contracts.js";
import type { AppPermission, AppRole } from "./models.js";

// Garde-fou de compilation : le contrat des Edge Functions doit rester aligné sur les enums SQL.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type __ContractAlignment = [
  Assert<Exact<AppRoleName, AppRole>>,
  Assert<Exact<AppPermissionName, AppPermission>>,
];
