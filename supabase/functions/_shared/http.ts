import type { ApiErrorCode, ApiFailure, ApiSuccess, ValidationIssue } from "./contracts.ts";
import { corsHeaders, isOriginAllowed } from "./cors.ts";
import type { PostgrestError } from "./deps.ts";

const MAX_BODY_BYTES = 32 * 1024;

/** Erreur « attendue », renvoyée telle quelle au client. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: ValidationIssue[],
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Convertit une erreur PostgREST en Error standard (message non exposé au client). */
export function databaseError(context: string, error: PostgrestError): Error {
  return new Error(`${context}: ${error.code} ${error.message}`);
}

export interface RequestContext {
  req: Request;
  methods: readonly string[];
}

export function jsonResponse<T>(
  ctx: RequestContext,
  body: ApiSuccess<T> | ApiFailure,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(ctx.req, ctx.methods),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function ok<T>(ctx: RequestContext, data: T, status = 200): Response {
  return jsonResponse(ctx, { ok: true, data }, status);
}

function fail(ctx: RequestContext, error: HttpError): Response {
  return jsonResponse(
    ctx,
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    },
    error.status,
  );
}

/** Lit un corps JSON en imposant Content-Type et taille maximale. */
export async function readJsonBody(req: Request): Promise<unknown> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "unsupported_media_type", "Le contenu doit être au format JSON.");
  }
  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "payload_too_large", "La requête est trop volumineuse.");
  }
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw new HttpError(413, "payload_too_large", "La requête est trop volumineuse.");
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "invalid_json", "Le corps de la requête n'est pas un JSON valide.");
  }
}

export interface ServeOptions {
  /** Nom de la fonction, utilisé dans les logs. */
  name: string;
  methods: readonly string[];
  handler: (ctx: RequestContext) => Promise<Response>;
}

/**
 * Point d'entrée commun : CORS, méthode HTTP, gestion d'erreurs uniforme.
 * Les erreurs inattendues sont journalisées côté serveur et masquées au client.
 */
export function serve(options: ServeOptions): void {
  Deno.serve(async (req) => {
    const ctx: RequestContext = { req, methods: options.methods };

    if (!isOriginAllowed(req)) {
      return fail(ctx, new HttpError(403, "forbidden_origin", "Origine non autorisée."));
    }
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(req, options.methods) });
    }
    if (!options.methods.includes(req.method)) {
      return fail(ctx, new HttpError(405, "method_not_allowed", "Méthode non autorisée."));
    }

    try {
      return await options.handler(ctx);
    } catch (error) {
      if (error instanceof HttpError) {
        return fail(ctx, error);
      }
      console.error(JSON.stringify({
        level: "error",
        function: options.name,
        message: error instanceof Error ? error.message : String(error),
      }));
      return fail(
        ctx,
        new HttpError(500, "internal_error", "Une erreur interne est survenue. Veuillez réessayer."),
      );
    }
  });
}
