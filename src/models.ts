/**
 * Alias lisibles des types générés (src/database.types.ts).
 * Ne pas dupliquer de modèle à la main : tout dérive du schéma PostgreSQL.
 */
import type { Enums, Tables, TablesInsert, TablesUpdate } from "./database.types.js";

// Enums
export type ContentStatus = Enums<"content_status">;
export type AppRole = Enums<"app_role">;
export type AppPermission = Enums<"app_permission">;
export type QuoteStatus = Enums<"quote_status">;
export type ContactStatus = Enums<"contact_status">;
export type SocialPlatform = Enums<"social_platform">;

// Lignes (SELECT)
export type ProfileRow = Tables<"profiles">;
export type RolePermissionRow = Tables<"role_permissions">;
export type ServiceCategoryRow = Tables<"service_categories">;
export type ServiceRow = Tables<"services">;
export type ProjectRow = Tables<"projects">;
export type ProjectImageRow = Tables<"project_images">;
export type ArticleCategoryRow = Tables<"article_categories">;
export type ArticleRow = Tables<"articles">;
export type EventRow = Tables<"events">;
export type TeamMemberRow = Tables<"team_members">;
export type TestimonialRow = Tables<"testimonials">;
export type QuoteRequestRow = Tables<"quote_requests">;
export type ContactMessageRow = Tables<"contact_messages">;
export type SiteSettingsRow = Tables<"site_settings">;
export type SocialLinkRow = Tables<"social_links">;

// Insertions (back-office)
export type ServiceCategoryInsert = TablesInsert<"service_categories">;
export type ServiceInsert = TablesInsert<"services">;
export type ProjectInsert = TablesInsert<"projects">;
export type ProjectImageInsert = TablesInsert<"project_images">;
export type ArticleCategoryInsert = TablesInsert<"article_categories">;
export type ArticleInsert = TablesInsert<"articles">;
export type EventInsert = TablesInsert<"events">;
export type TeamMemberInsert = TablesInsert<"team_members">;
export type TestimonialInsert = TablesInsert<"testimonials">;
export type SocialLinkInsert = TablesInsert<"social_links">;

// Mises à jour (back-office)
export type ProfileUpdate = TablesUpdate<"profiles">;
export type ServiceCategoryUpdate = TablesUpdate<"service_categories">;
export type ServiceUpdate = TablesUpdate<"services">;
export type ProjectUpdate = TablesUpdate<"projects">;
export type ProjectImageUpdate = TablesUpdate<"project_images">;
export type ArticleCategoryUpdate = TablesUpdate<"article_categories">;
export type ArticleUpdate = TablesUpdate<"articles">;
export type EventUpdate = TablesUpdate<"events">;
export type TeamMemberUpdate = TablesUpdate<"team_members">;
export type TestimonialUpdate = TablesUpdate<"testimonials">;
export type SiteSettingsUpdate = TablesUpdate<"site_settings">;
export type SocialLinkUpdate = TablesUpdate<"social_links">;

/**
 * Seules colonnes modifiables par l'équipe sur les demandes (privilèges par
 * colonne en base) : le contenu soumis par le prospect est immuable.
 */
export type QuoteRequestUpdate = Pick<TablesUpdate<"quote_requests">, "status" | "assigned_to" | "internal_notes">;
export type ContactMessageUpdate = Pick<TablesUpdate<"contact_messages">, "status" | "internal_notes">;

/** Résultat de la RPC `get_my_access`. */
export interface MyAccess {
  role: AppRole;
  permissions: AppPermission[];
}
