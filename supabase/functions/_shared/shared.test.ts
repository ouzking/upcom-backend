// Tests unitaires des modules partagés. Exécution : deno test supabase/functions
import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import { escapeHtml } from "./email.ts";
import { HttpError } from "./http.ts";
import { safeEqual } from "./security.ts";
import { renderNotification } from "./templates.ts";
import { contactMessageSchema, inviteUserSchema, parsePayload, quoteRequestSchema } from "./validation.ts";

const validQuote = {
  name: "  Awa Diop ",
  email: "Awa.Diop@Example.com",
  message: "Nous souhaitons un devis pour une campagne.",
};

Deno.test("quote: normalise les champs valides", () => {
  const out = parsePayload(quoteRequestSchema, { ...validQuote, company: "", phone: " 77 000 00 00 " });
  assertEquals(out.name, "Awa Diop");
  assertEquals(out.email, "awa.diop@example.com");
  assertEquals(out.company, null);
  assertEquals(out.phone, "77 000 00 00");
  assertEquals(out.service_id, null);
  assertEquals(out.deadline, null);
});

Deno.test("quote: refuse les champs inconnus (ex. status)", () => {
  const error = assertThrows(
    () => parsePayload(quoteRequestSchema, { ...validQuote, status: "converted" }),
    HttpError,
  );
  assertEquals(error.status, 422);
});

Deno.test("quote: refuse e-mail, téléphone et date invalides", () => {
  const error = assertThrows(
    () =>
      parsePayload(quoteRequestSchema, {
        ...validQuote,
        email: "pas-un-email",
        phone: "<script>",
        deadline: "2000-01-01",
      }),
    HttpError,
  );
  const fields = (error.details ?? []).map((issue) => issue.field).sort();
  assertEquals(fields, ["deadline", "email", "phone"]);
});

Deno.test("quote: message trop court", () => {
  assertThrows(() => parsePayload(quoteRequestSchema, { ...validQuote, message: "court" }), HttpError);
});

Deno.test("contact: payload minimal valide", () => {
  const out = parsePayload(contactMessageSchema, { name: "Moussa", email: "m@example.com", message: "Bonjour, une question." });
  assertEquals(out.subject, null);
});

Deno.test("invite: rôle inconnu refusé", () => {
  assertThrows(() => parsePayload(inviteUserSchema, { email: "a@example.com", role: "root" }), HttpError);
});

Deno.test("safeEqual", () => {
  assert(safeEqual("secret-value", "secret-value"));
  assert(!safeEqual("secret-value", "secret-valuf"));
  assert(!safeEqual("secret", "secret-longer"));
});

Deno.test("escapeHtml et gabarit : aucune injection HTML", () => {
  assertEquals(escapeHtml(`<img src=x onerror="a">&'`), "&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;");
  const { html, text } = renderNotification({
    title: "Test",
    intro: "Intro",
    fields: [["Nom", "<b>Hack</b>"], ["Vide", null]],
    message: "<script>alert(1)</script>",
  });
  assert(!html.includes("<script>"));
  assert(!html.includes("<b>Hack</b>"));
  assert(!text.includes("Vide"));
});
