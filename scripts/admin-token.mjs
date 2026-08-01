#!/usr/bin/env node
/**
 * Genera un token JWT de super_admin para usar con la API Mtsprz.
 *
 * Uso:
 *   node scripts/admin-token.mjs
 *   node scripts/admin-token.mjs --raw        # solo el token (para $env:MTSPRZ_API_TOKEN)
 *
 * El token expira en 7 días. Lee JWT_SECRET y SEED_ADMIN_EMAIL desde .env.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ── Cargar .env ──────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("✗ No se encontró .env en:", envPath);
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").replace(/\\n/g, "\n");
  }
  return env;
}

const env = loadEnv();
const secret = env.JWT_SECRET;
const email = env.SEED_ADMIN_EMAIL;

if (!secret || !email) {
  console.error("✗ Falta JWT_SECRET o SEED_ADMIN_EMAIL en .env");
  process.exit(1);
}

// ── Build JWT (HS256) ────────────────────────────────────────────────
const base64url = (obj) =>
  Buffer.from(JSON.stringify(obj)).toString("base64url");

const now = Math.floor(Date.now() / 1000);
const header = { alg: "HS256", typ: "JWT" };
const payload = {
  id: 1,
  email,
  role: "super_admin",
  iat: now,
  exp: now + 86400 * 7, // 7 días
};

const signingInput = `${base64url(header)}.${base64url(payload)}`;
const signature = crypto
  .createHmac("sha256", secret)
  .update(signingInput)
  .digest("base64url");

const token = `${signingInput}.${signature}`;

const raw = process.argv.includes("--raw");
if (raw) {
  console.log(token);
} else {
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  TOKEN SUPER_ADMIN (expira en 7 días)               ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
  console.log("PowerShell:");
  console.log(`  $env:MTSPRZ_API_TOKEN="${token}"`);
  console.log("  echo $env:MTSPRZ_API_TOKEN   # verificar que quedó");
  console.log("");
  console.log("Bash/WSL:");
  console.log(`  export MTSPRZ_API_TOKEN="${token}"`);
  console.log("");
  console.log("Luego:");
  console.log("  cd scripts/prospector");
  console.log("  uv run prospector push-leads --min-score 40");
  console.log("");
}
