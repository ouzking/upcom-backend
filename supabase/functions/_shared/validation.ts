import { z } from "./deps.ts";
import { HttpError } from "./http.ts";

export const PHONE_PATTERN = /^\+?[0-9 ().-]{6,30}$/;

/** "" et espaces → null ; undefined → null. */
function emptyToNull<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    schema.nullish().transform((value) => value ?? null),
  );
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export const nameField = z
  .string({ required_error: "Le nom est requis.", invalid_type_error: "Le nom est invalide." })
  .trim()
  .min(2, "Le nom doit contenir au moins 2 caractères.")
  .max(120, "Le nom ne peut pas dépasser 120 caractères.");

export const emailField = z
  .string({ required_error: "L'adresse e-mail est requise.", invalid_type_error: "Adresse e-mail invalide." })
  .trim()
  .toLowerCase()
  .max(254, "Adresse e-mail trop longue.")
  .email("Adresse e-mail invalide.");

export const phoneField = emptyToNull(
  z.string().trim().regex(PHONE_PATTERN, "Numéro de téléphone invalide."),
);

export const messageField = z
  .string({ required_error: "Le message est requis.", invalid_type_error: "Le message est invalide." })
  .trim()
  .min(10, "Le message doit contenir au moins 10 caractères.")
  .max(5000, "Le message ne peut pas dépasser 5000 caractères.");

const optionalText = (max: number, label: string) =>
  emptyToNull(z.string().trim().max(max, `${label} : ${max} caractères maximum.`));

/** Champs anti-spam communs aux formulaires publics. */
const antiSpamFields = {
  captcha_token: z.string().max(4096).optional(),
  website: z.string().max(500).optional(),
};

export const quoteRequestSchema = z
  .object({
    name: nameField,
    company: optionalText(160, "Entreprise"),
    email: emailField,
    phone: phoneField,
    service_id: emptyToNull(z.string().uuid("Service invalide.")),
    budget: optionalText(100, "Budget"),
    deadline: emptyToNull(
      z
        .string()
        .date("Date invalide (format attendu : AAAA-MM-JJ).")
        .refine((value) => value >= todayIso(), "La date souhaitée ne peut pas être dans le passé."),
    ),
    message: messageField,
    ...antiSpamFields,
  })
  .strict();

export const contactMessageSchema = z
  .object({
    name: nameField,
    email: emailField,
    phone: phoneField,
    subject: optionalText(200, "Objet"),
    message: messageField,
    ...antiSpamFields,
  })
  .strict();

/** Charge utile des fonctions de notification (appel direct ou Database Webhook). */
export const notificationPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  force: z.boolean().optional(),
  // Format Database Webhook Supabase : { type, table, schema, record, old_record }
  type: z.string().optional(),
  record: z.object({ id: z.string().uuid() }).passthrough().optional(),
}).passthrough();

export const inviteUserSchema = z
  .object({
    email: emailField,
    full_name: optionalText(120, "Nom complet"),
    role: z.enum(["super_admin", "editor", "commercial", "communication_manager"], {
      errorMap: () => ({ message: "Rôle invalide." }),
    }),
  })
  .strict();

/** Valide une entrée ; lève une HttpError 422 détaillée par champ. */
export function parsePayload<T extends z.ZodTypeAny>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(
      422,
      "validation_error",
      "Certaines informations sont invalides.",
      result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "_",
        message: issue.code === "unrecognized_keys" ? "Champ(s) non autorisé(s)." : issue.message,
      })),
    );
  }
  return result.data;
}
