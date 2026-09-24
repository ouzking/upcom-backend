# Edge Functions — contrat d'API

Base URL : `https://<project-ref>.supabase.co/functions/v1/`
Types TypeScript : `import type { SubmitQuoteRequestPayload, ApiResponse, … } from "@upcom/supabase"`.

## Enveloppe de réponse

```jsonc
// Succès
{ "ok": true, "data": { … } }
// Erreur
{ "ok": false, "error": { "code": "validation_error", "message": "…", "details": [{ "field": "email", "message": "Adresse e-mail invalide." }] } }
```

| HTTP | `code` |
|---|---|
| 400 | `invalid_json`, `captcha_failed` |
| 401 / 403 | `unauthorized`, `forbidden`, `forbidden_origin` |
| 404 | `not_found` |
| 405 | `method_not_allowed` |
| 409 | `conflict` |
| 413 / 415 | `payload_too_large`, `unsupported_media_type` |
| 422 | `validation_error` (détails par champ, messages en français) |
| 429 | `rate_limited` |
| 500 | `internal_error` (détail uniquement dans les logs serveur) |

## `submit-quote-request` (public)

```ts
const { data, error } = await supabase.functions.invoke<ApiResponse<SubmitQuoteRequestResult>>(
  EDGE_FUNCTIONS.submitQuoteRequest,
  {
    body: {
      name: "…", email: "…", message: "…",           // requis
      company: "…", phone: "…", service_id: "<uuid>", // optionnels
      budget: "…", deadline: "2026-12-01",
      captcha_token: turnstileToken,                  // requis si Turnstile activé
      website: "",                                    // honeypot : champ caché, laisser vide
    } satisfies SubmitQuoteRequestPayload,
  },
);
```

Réponse `201 { ok: true, data: { id } }`. Le service doit exister et être publié.
Limite : 3 demandes / 15 min / IP.

> `supabase.functions.invoke` renvoie `error` (FunctionsHttpError) pour tout statut ≠ 2xx ;
> le corps JSON détaillé est lisible via `await error.context.json()`.

## `submit-contact-message` (public)

Body : `name`, `email`, `message` (requis), `phone`, `subject`, `captcha_token`, `website`.
Réponse `201 { ok: true, data: { id } }`. Limite : 5 messages / 15 min / IP.

## `send-quote-notification` / `send-contact-notification`

Envoient l'e-mail interne (Resend) et renseignent `notified_at`. Idempotentes.

- **Appel automatique** : effectué par les fonctions `submit-*` juste après l'insertion (en arrière-plan).
- **Renvoi depuis le back-office** : `invoke("send-quote-notification", { body: { id, force: true } })`
  avec la session de l'utilisateur (permission `quotes.view` / `contacts.view`).
- **Database Webhook (optionnel)** : si des lignes sont insérées par un autre canal, créer un webhook
  *INSERT* sur la table vers la fonction, avec l'en-tête `x-webhook-secret: <NOTIFICATION_WEBHOOK_SECRET>`.
  Le contenu du webhook n'est jamais utilisé tel quel : la ligne est relue en base.

Réponse : `{ status: "sent" } | { status: "already_notified" } | { status: "skipped", reason }`
(`skipped` si l'e-mail n'est pas configuré — la ligne reste `notified_at = null`).

## `admin-invite-user` (back-office, `users.manage`)

```ts
await supabase.functions.invoke("admin-invite-user", {
  body: { email: "nouveau@…", full_name: "…", role: "editor" } satisfies AdminInviteUserPayload,
});
```

Envoie l'invitation Supabase Auth (lien vers `ADMIN_INVITE_REDIRECT_URL`) et attribue le rôle.
`409 conflict` si l'adresse a déjà un compte.

## Développement local

```bash
cp supabase/functions/.env.example supabase/functions/.env
npm run functions:serve            # http://127.0.0.1:54321/functions/v1/<nom>
curl -i -X POST http://127.0.0.1:54321/functions/v1/submit-contact-message \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Bonjour, ceci est un test."}'
```
