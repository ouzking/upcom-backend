#!/usr/bin/env node
/**
 * UPCOM — mise en place des enregistrements DNS d'envoi d'e-mails (Resend) dans Netlify DNS.
 *
 *   npm run email:dns              → diagnostic + aperçu (rien n'est modifié)
 *   npm run email:dns -- --apply   → crée les enregistrements manquants et lance la vérification Resend
 *
 * Lit .env (ignoré par Git) :
 *   RESEND_API_KEY        clé Resend avec accès « Full access » (gestion des domaines)
 *   NETLIFY_AUTH_TOKEN    jeton personnel Netlify (User settings → Applications → Personal access tokens)
 *   EMAIL_DOMAIN          (facultatif) domaine d'envoi, défaut : domaine de EMAIL_FROM
 *
 * Étapes : 1. enregistrements attendus lus dans Resend (création du domaine si absent)
 *          2. zone DNS Netlify servie par les serveurs réellement délégués
 *          3. création des enregistrements manquants (jamais de doublon, jamais de suppression)
 *          4. contrôle sur les serveurs DNS faisant autorité, puis vérification Resend
 * Aucune clé n'est affichée.
 */
import { Resolver } from "node:dns/promises";

const APPLY = process.argv.includes("--apply");

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const resendKey = process.env.RESEND_API_KEY?.trim();
const netlifyToken = process.env.NETLIFY_AUTH_TOKEN?.trim();
const fromDomain = process.env.EMAIL_FROM?.match(/@([^>\s]+)/)?.[1];
const domain = (process.env.EMAIL_DOMAIN?.trim() || fromDomain || "").toLowerCase();

if (!resendKey) fail("RESEND_API_KEY manquante dans .env (clé Resend « Full access »).");
if (!netlifyToken) fail("NETLIFY_AUTH_TOKEN manquant dans .env.");
if (!domain) fail("Domaine d'envoi introuvable : renseignez EMAIL_FROM ou EMAIL_DOMAIN.");

async function http(base, token, method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) fail(`${method} ${base}${path} → HTTP ${response.status} : ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
const resend = (method, path, body) => http("https://api.resend.com", resendKey, method, path, body);
const netlify = (method, path, body) => http("https://api.netlify.com/api/v1", netlifyToken, method, path, body);

const fqdn = (name) => {
  const clean = name.replace(/\.$/, "").toLowerCase();
  return clean === domain || clean.endsWith(`.${domain}`) ? clean : `${clean}.${domain}`;
};
const normalizeTxt = (value) => value.replace(/^"|"$/g, "").replace(/"\s*"/g, "").trim();

// --- 1. Resend -----------------------------------------------------------------
console.log(`\nDomaine d'envoi : ${domain} — ${APPLY ? "APPLICATION" : "APERÇU (ajoutez --apply)"}\n`);
const domains = (await resend("GET", "/domains")).data ?? [];
let resendDomain = domains.find((entry) => entry.name === domain);
if (!resendDomain) {
  if (!APPLY) fail(`Le domaine ${domain} n'existe pas dans Resend (il sera créé avec --apply).`);
  resendDomain = await resend("POST", "/domains", { name: domain });
  console.log(`✓ Domaine ajouté dans Resend (${resendDomain.region ?? "région par défaut"})`);
}
const details = await resend("GET", `/domains/${resendDomain.id}`);
console.log(`Resend : statut « ${details.status} », région ${details.region ?? "—"}`);
const expected = (details.records ?? []).map((record) => ({
  type: record.type,
  hostname: fqdn(record.name),
  value: record.type === "TXT" ? normalizeTxt(record.value) : record.value.replace(/\.$/, ""),
  priority: record.priority ?? null,
  purpose: record.record,
  status: record.status,
}));
if (!expected.length) fail("Resend n'a renvoyé aucun enregistrement attendu.");

// --- 2. Zone Netlify réellement déléguée ----------------------------------------
const base = new Resolver();
base.setServers(["8.8.8.8", "1.1.1.1"]);
const delegated = (await base.resolveNs(domain).catch(() => [])).map((ns) => ns.toLowerCase()).sort();
const zones = (await netlify("GET", "/dns_zones")).filter((zone) => zone.name === domain);
if (!zones.length) fail(`Aucune zone DNS « ${domain} » dans ce compte Netlify (le domaine est peut-être dans une autre équipe).`);
const zone = zones.find((candidate) => (candidate.dns_servers ?? []).map((ns) => ns.toLowerCase()).sort().join() === delegated.join()) ?? zones[0];
if (zones.length > 1) console.log(`⚠ ${zones.length} zones « ${domain} » dans Netlify : utilisation de celle servie par ${delegated.join(", ")}.`);
if (delegated.length && zone.dns_servers && !(zone.dns_servers ?? []).some((ns) => delegated.includes(ns.toLowerCase()))) {
  console.log(`⚠ La zone Netlify (${zone.dns_servers.join(", ")}) n'est PAS celle déléguée au domaine (${delegated.join(", ")}).`);
}
const existing = await netlify("GET", `/dns_zones/${zone.id}/dns_records`);

// --- 3. Enregistrements manquants ------------------------------------------------
const matches = (record, wanted) =>
  record.type === wanted.type &&
  record.hostname.toLowerCase() === wanted.hostname &&
  (wanted.type === "TXT" ? normalizeTxt(record.value) === wanted.value : record.value.replace(/\.$/, "").toLowerCase() === wanted.value.toLowerCase());

const toCreate = [];
console.log("\nEnregistrements attendus par Resend :");
for (const wanted of expected) {
  const present = existing.some((record) => matches(record, wanted));
  const conflicting = existing.filter((record) => record.type === wanted.type && record.hostname.toLowerCase() === wanted.hostname && !matches(record, wanted));
  console.log(`  ${present ? "✓" : "＋"} ${wanted.type.padEnd(4)} ${wanted.hostname.padEnd(42)} ${wanted.purpose ?? ""}${present ? "" : " (à créer)"}`);
  for (const record of conflicting) console.log(`    ⚠ valeur différente déjà présente : ${String(record.value).slice(0, 60)}… (conservée, à vérifier)`);
  if (!present) toCreate.push(wanted);
}
// Politique DMARC minimale recommandée (délivrabilité Gmail / Yahoo).
const dmarc = `_dmarc.${domain}`;
if (!existing.some((record) => record.type === "TXT" && record.hostname.toLowerCase() === dmarc) && !expected.some((record) => record.hostname === dmarc)) {
  console.log(`  ＋ TXT  ${dmarc.padEnd(42)} DMARC (recommandé, à créer)`);
  toCreate.push({ type: "TXT", hostname: dmarc, value: "v=DMARC1; p=none;", priority: null });
}

if (!APPLY) {
  console.log(`\n${toCreate.length} enregistrement(s) à créer. Aperçu uniquement : relancez avec --apply.\n`);
  process.exit(0);
}

for (const record of toCreate) {
  await netlify("POST", `/dns_zones/${zone.id}/dns_records`, {
    type: record.type,
    hostname: record.hostname,
    value: record.value,
    ttl: 3600,
    ...(record.priority != null ? { priority: record.priority } : {}),
  });
  console.log(`  ✓ créé : ${record.type} ${record.hostname}`);
}

// --- 4. Contrôle DNS faisant autorité puis vérification Resend -------------------
const authoritative = new Resolver();
const nsIp = (await base.resolve4(delegated[0] ?? zone.dns_servers[0]))[0];
authoritative.setServers([nsIp]);
console.log(`\nContrôle sur ${delegated[0]} :`);
for (let attempt = 1; attempt <= 12; attempt += 1) {
  const missing = [];
  for (const wanted of [...expected, ...toCreate.filter((record) => record.hostname === dmarc)]) {
    const values = await (wanted.type === "MX" ? authoritative.resolveMx(wanted.hostname).then((rows) => rows.map((row) => row.exchange)) : authoritative.resolveTxt(wanted.hostname).then((rows) => rows.map((row) => row.join(""))))
      .catch(() => []);
    if (!values.some((value) => (wanted.type === "TXT" ? normalizeTxt(value) === wanted.value : value.toLowerCase() === wanted.value.toLowerCase()))) missing.push(wanted.hostname);
  }
  if (!missing.length) {
    console.log("  ✓ tous les enregistrements sont publiés");
    break;
  }
  if (attempt === 12) console.log(`  ⚠ encore absents : ${missing.join(", ")} — la vérification Resend reprendra automatiquement.`);
  else await new Promise((resolve) => setTimeout(resolve, 10_000));
}

await resend("POST", `/domains/${resendDomain.id}/verify`);
console.log("✓ Vérification Resend lancée (statut visible dans Resend → Domains, en général quelques minutes).\n");
