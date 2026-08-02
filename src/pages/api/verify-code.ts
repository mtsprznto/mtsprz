import type { APIRoute } from "astro";
import { createHash, timingSafeEqual } from "node:crypto";
import { query, initDb } from "../../lib/db";
import { sanitizeBody, isValidCode, validateBodySize } from "../../lib/validators";
import { checkVerifyRateLimit } from "../../lib/rate-limit";

export const prerender = false;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { email?: string; code?: string };
  try {
    body = sanitizeBody(await request.json());
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  if (!validateBodySize(body)) {
    return new Response(JSON.stringify({ error: "Solicitud demasiado grande" }), { status: 413 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  // 🔐 Validate code is a string of exactly 6 digits BEFORE any operation
  // This prevents NoSQL Injection: objects/arrays/numbers crash on .trim()
  if (!email || !isValidCode(body.code)) {
    return new Response(JSON.stringify({ error: "Código inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const code: string = body.code;

  // 🛡️ Rate limit: max 5 attempts per minute per email (prevents brute force of 6-digit code)
  const rateCheck = checkVerifyRateLimit(email);
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({
      error: "Demasiados intentos. Intenta en un minuto.",
    }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  // 🛡️ Anti-enumeration: generic error for any failure (wrong code, expired, no email)
  // Prevents attacker from distinguishing existing vs non-existing emails
  const genericError = "Código inválido o expirado. Solicita uno nuevo.";
  const jsonHeaders = { "Content-Type": "application/json" };

  // 🔎 Read persisted code from NeonDB (survives serverless instance hopping)
  let row: Record<string, unknown> | undefined;
  try {
    await initDb(); // ensures table exists (idempotent)
    const res = await query(
      "SELECT code_hash, expires_at, attempts FROM verification_codes WHERE email = $1",
      [email],
    );
    row = res.rows[0];
  } catch (err) {
    console.error("[DB] Failed to read verification code:", err);
    return new Response(JSON.stringify({ error: genericError }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  if (!row) {
    return new Response(JSON.stringify({ error: genericError }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const storedHash = String(row.code_hash ?? "");
  const expiresAt = new Date(row.expires_at as string).getTime();
  const attempts = Number(row.attempts ?? 0);

  // Expired → remove silently, generic failure (no timing signal)
  if (Date.now() > expiresAt) {
    await query("DELETE FROM verification_codes WHERE email = $1", [email]).catch(() => {});
    return new Response(JSON.stringify({ error: genericError }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  // Constant-time comparison of SHA-256 hashes
  const inputHash = sha256Hex(code);
  const hashesMatch =
    storedHash.length === 64 &&
    inputHash.length === 64 &&
    timingSafeEqual(Buffer.from(inputHash, "hex"), Buffer.from(storedHash, "hex"));

  if (!hashesMatch) {
    // Brute-force guard: lockout after 5 failed tries per code (10 min TTL)
    const nextAttempts = attempts + 1;
    if (nextAttempts >= 5) {
      await query("DELETE FROM verification_codes WHERE email = $1", [email]).catch(() => {});
    } else {
      await query("UPDATE verification_codes SET attempts = $2 WHERE email = $1", [email, nextAttempts]).catch(() => {});
    }
    return new Response(JSON.stringify({ error: genericError }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  // ✅ Valid: consume the code (single-use), then mark email verified
  await query("DELETE FROM verification_codes WHERE email = $1", [email]).catch(() => {});

  try {
    await query("INSERT INTO verified_emails (email) VALUES ($1) ON CONFLICT (email) DO NOTHING", [email]);
  } catch (err) {
    console.error("[DB] Failed to save email:", err);
  }

  cookies.set("mtsprz_verified", email, {
    path: "/",
    maxAge: 86400,
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
  });

  return new Response(JSON.stringify({ success: true, email }), { status: 200 });
};
