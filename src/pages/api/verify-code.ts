import type { APIRoute } from "astro";
import { query, initDb } from "../../lib/db";
import { sanitizeBody, isValidCode, validateBodySize } from "../../lib/validators";
import { checkVerifyRateLimit } from "../../lib/rate-limit";

export const prerender = false;

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
  const store = (globalThis as any)._verificationCodes as Map<string, { code: string; expires: number }> | undefined;
  const stored = store?.get(email);

  const genericError = "Código inválido o expirado. Solicita uno nuevo.";

  if (!stored || Date.now() > stored.expires || stored.code !== code) {
    if (stored && Date.now() > stored.expires) store?.delete(email);
    return new Response(JSON.stringify({ error: genericError }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  store?.delete(email);

  try {
    await initDb();
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
