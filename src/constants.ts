import type {
  AppPermission,
  AppRole,
  ContactStatus,
  ContentStatus,
  QuoteStatus,
  SocialPlatform,
} from "./models.js";

/** Charte graphique officielle UPCOM. */
export const BRAND = {
  colors: {
    blue: "#013592",
    orange: "#FD8E03",
    white: "#FFFFFF",
  },
  gradients: {
    blue: { from: "#013592", to: "#0172E7" },
    orange: { from: "#EB4602", to: "#FD8E03" },
  },
} as const;

/** Buckets Storage (tous publics en lecture, écriture selon permission). */
export const STORAGE_BUCKETS = {
  siteAssets: "site-assets",
  services: "services",
  projects: "projects",
  team: "team",
  articles: "articles",
  events: "events",
  testimonials: "testimonials",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/** Permission requise pour écrire dans chaque bucket (miroir de private.can_write_bucket). */
export const BUCKET_WRITE_PERMISSION: Record<StorageBucket, AppPermission> = {
  "site-assets": "settings.manage",
  services: "services.manage",
  projects: "projects.manage",
  team: "team.manage",
  articles: "articles.manage",
  events: "events.manage",
  testimonials: "testimonials.manage",
};

/** Types MIME acceptés par les buckets de contenu (site-assets accepte aussi SVG / ICO). */
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

/** Noms des Edge Functions (supabase.functions.invoke(EDGE_FUNCTIONS.submitQuoteRequest, …)). */
export const EDGE_FUNCTIONS = {
  submitQuoteRequest: "submit-quote-request",
  submitContactMessage: "submit-contact-message",
  sendQuoteNotification: "send-quote-notification",
  sendContactNotification: "send-contact-notification",
  adminInviteUser: "admin-invite-user",
} as const;

// Libellés français partagés par le site et le back-office
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super administrateur",
  editor: "Éditeur",
  commercial: "Commercial",
  communication_manager: "Responsable communication",
};

export const PERMISSION_LABELS: Record<AppPermission, string> = {
  "services.manage": "Gérer les services",
  "projects.manage": "Gérer les réalisations",
  "articles.manage": "Gérer les actualités",
  "events.manage": "Gérer les événements",
  "team.manage": "Gérer l'équipe",
  "testimonials.manage": "Gérer les témoignages",
  "quotes.view": "Consulter les demandes de devis",
  "quotes.manage": "Traiter les demandes de devis",
  "contacts.view": "Consulter les messages",
  "contacts.manage": "Traiter les messages",
  "settings.manage": "Gérer les paramètres du site",
  "users.manage": "Gérer les utilisateurs",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  new: "Nouvelle",
  in_progress: "En cours",
  contacted: "Contacté",
  converted: "Convertie",
  closed: "Clôturée",
};

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  new: "Nouveau",
  read: "Lu",
  replied: "Répondu",
  archived: "Archivé",
};

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X",
  youtube: "YouTube",
  tiktok: "TikTok",
  whatsapp: "WhatsApp",
  other: "Autre",
};
