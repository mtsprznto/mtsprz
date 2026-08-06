#!/usr/bin/env node
/**
 * Test local de envío de emails — reproducible SIEMPRE (WSL o Windows).
 *
 * Uso:
 *   node --env-file=.env scripts/test-emails.mjs          # modo check: render templates + config
 *   node --env-file=.env scripts/test-emails.mjs --send   # + envío REAL vía Resend
 *
 * Cómo funciona:
 *   Node >=22.23 carga .ts como ESM (type-stripping) y falla al resolver imports
 *   relativos sin extensión (`./validators`). Este script compila mail.ts +
 *   validators.ts a CJS en un dir temporal (transpileModule, import.meta.env
 *   shimeado a process.env — en Astro/Vercel son equivalentes) y los require.
 *   Así el test corre sobre el código real, sin deps extra ni pnpm.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const SEND = process.argv.includes("--send");
const PROSPECT_TO = process.argv.find((a) => a.startsWith("--to="))?.slice(5) || "lit.io30303@gmail.com";

let failures = 0;
const ok = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => {
  failures++;
  console.error(`  ❌ ${msg}`);
};
const assert = (cond, msg) => (cond ? ok(msg) : fail(msg));

function transpileCjs(fileRel) {
  const srcPath = path.join(ROOT, "src/lib", fileRel);
  let src = fs.readFileSync(srcPath, "utf8");
  // Astro/Vercel exponen vars de entorno en import.meta.env; CJS no tiene import.meta.
  src = src.replace(/import\.meta\.env/g, "process.env");
  const out = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.Node10,
    },
    fileName: path.basename(srcPath),
  }).outputText;
  return out;
}

function build() {
  // Compilar DENTRO de node_modules/ para que require("resend") resuelva las deps del proyecto
  // (un dir en /tmp no sube por la cadena de node_modules del repo).
  // Extensión .js (no .cjs): bajo node_modules Node aplica CJS por defecto, y así
  // require("./validators") de mail.js resuelve validators.js sin ambigüedad.
  const tmp = fs.mkdtempSync(path.join(ROOT, "node_modules", ".mailtest-"));
  fs.writeFileSync(path.join(tmp, "validators.js"), transpileCjs("validators.ts"));
  fs.writeFileSync(path.join(tmp, "mail.js"), transpileCjs("mail.ts"));
  const { sendEmail, leadReceivedEmail, adminNewLeadEmail } = require(path.join(tmp, "mail.js"));
  return { tmp, mail: { sendEmail, leadReceivedEmail, adminNewLeadEmail } };
}

console.log("mtsprz — test de emails");
console.log(`modo: ${SEND ? "ENVÍO REAL (--send)" : "check local (sin envío; usa --send)"}\n`);

// --- 1. Build del código real ---
console.log("1) Compilando src/lib/mail.ts + validators.ts → CJS temporal");
let mail;
try {
  const built = build();
  mail = built.mail;
  ok("compila y carga (require) sin errores");
} catch (e) {
  fail(`no compila: ${e.message}`);
  process.exit(1);
}

// --- 2. Render de templates ---
console.log("\n2) Templates renderizan");
let htmlProspecto, htmlAdmin;
try {
  htmlProspecto = mail.leadReceivedEmail("María González", "web");
  assert(typeof htmlProspecto === "string" && htmlProspecto.includes("Recibimos tu solicitud"), "leadReceivedEmail renderiza");
  assert(htmlProspecto.includes("María González"), "leadReceivedEmail incluye nombre");
  assert(htmlProspecto.includes("diagnóstico digital gratis"), "leadReceivedEmail incluye propuesta");

  htmlAdmin = mail.adminNewLeadEmail({
    name: "María González",
    phone: "56988457548",
    email: "maria@gmail.com",
    source: "web",
    serviceInterest: "web",
    message: "Hola, quiero diagnóstico.\nSegunda línea.",
    createdAt: new Date().toISOString(),
  });
  assert(typeof htmlAdmin === "string" && htmlAdmin.includes("Nuevo Lead"), "adminNewLeadEmail renderiza");
  assert(htmlAdmin.includes("56988457548"), "adminNewLeadEmail incluye WhatsApp");
  assert(htmlAdmin.includes("maria@gmail.com"), "adminNewLeadEmail incluye email");
  assert(htmlAdmin.includes("<br />"), "adminNewLeadEmail escapa saltos de línea");
  assert(htmlAdmin.includes("America/Santiago") === false, "adminNewLeadEmail usa hora local (no tz cruda)");
} catch (e) {
  fail(`render falla: ${e.message}`);
}

// --- 3. Sanitización XSS ---
console.log("\n3) Sanitización (XSS)");
try {
  const evil = mail.leadReceivedEmail('<script>alert(1)</script>', '<img src=x onerror=alert(2)>');
  assert(!evil.includes("<script>"), "leadReceivedEmail escapa <script>");
  assert(evil.includes("&lt;script&gt;"), "leadReceivedEmail codifica etiquetas");
  const evilAdmin = mail.adminNewLeadEmail({
    name: "<b>Hack</b>",
    phone: null,
    email: null,
    source: "x",
    serviceInterest: null,
    message: "<img src=x>",
    createdAt: new Date().toISOString(),
  });
  assert(!evilAdmin.includes("<img"), "adminNewLeadEmail escapa HTML del mensaje");
} catch (e) {
  fail(`sanitización falla: ${e.message}`);
}

// --- 4. Config de entorno ---
console.log("\n4) Configuración (.env)");
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM;
const to = process.env.RESEND_TO;
if (apiKey) ok("RESEND_API_KEY presente");
else fail("RESEND_API_KEY ausente — en prod los emails NO se enviarán (sendEmail simula)");
if (from) ok(`RESEND_FROM presente (${from})`);
else fail("RESEND_FROM ausente (usará fallback contratos@mtsprz.org)");
if (to) ok(`RESEND_TO presente (${to})`);
else ok("RESEND_TO ausente (fallback contacto@mtsprz.org)");
const domainVerified = /@mtsprz\.org$/.test(from || "") || /@mtsprz\.org$/.test(to || "");
assert(domainVerified, "dominio mtsprz.org en FROM/TO (debe estar verificado en Resend para entregar)");

// --- 5. Envío real (solo con --send) ---
if (SEND) {
  console.log("\n5) Envío real vía Resend");
  if (!apiKey) {
    fail("RESEND_API_KEY ausente — no se puede enviar de verdad");
  } else {
    const adminOk = await mail.sendEmail({
      to: to || "contacto@mtsprz.org",
      subject: "TEST — Nuevo lead: María González",
      html: htmlAdmin,
      fromName: "Mtsprz",
      replyTo: PROSPECT_TO,
    });
    assert(adminOk, "email admin enviado");

    const prospectOk = await mail.sendEmail({
      to: PROSPECT_TO,
      subject: "TEST — Recibimos tu solicitud — diagnóstico gratis",
      html: htmlProspecto,
      fromName: "Mtsprz",
    });
    assert(prospectOk, "email prospecto enviado");
  }
} else {
  console.log("\n5) Envío real — omitido (pasa --send para enviar de verdad)");
}

console.log("");
if (failures > 0) {
  console.error(`❌ ${failures} fallo(s)`);
  process.exit(1);
}
console.log("✅ TODO OK");
