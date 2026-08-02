import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { sanitizeBody, validateBodySize } from "../../lib/validators";
import { checkRateLimit } from "../../lib/rate-limit";
import { query, initDb } from "../../lib/db";

export const prerender = false;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export const POST: APIRoute = async ({ request }) => {
  let body: { email?: string };
  try {
    body = sanitizeBody(await request.json());
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  if (!validateBodySize(body)) {
    return new Response(JSON.stringify({ error: "Solicitud demasiado grande" }), { status: 413 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Correo electrónico inválido" }), { status: 400 });
  }

  // 🛡️ Rate limit: max 3 codes/hour per email, 10 codes/hour per IP
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const emailLimit = checkRateLimit(`send-code:email:${email}`, 3, 3600_000);
  if (!emailLimit.allowed) {
    return new Response(JSON.stringify({
      error: "Demasiados códigos solicitados para este correo. Intenta en 1 hora.",
    }), { status: 429 });
  }

  const ipLimit = checkRateLimit(`send-code:ip:${clientIp}`, 10, 3600_000);
  if (!ipLimit.allowed) {
    return new Response(JSON.stringify({
      error: "Demasiadas solicitudes desde esta IP. Intenta más tarde.",
    }), { status: 429 });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = sha256Hex(code);

  // 💾 Persist code in NeonDB (not in-memory: Vercel serverless multi-instance
  // would lose codes between instances / cold starts).
  try {
    await initDb();
    // Cheap cleanup of expired codes (one row per email)
    await query("DELETE FROM verification_codes WHERE expires_at < NOW()", []);
    // One active code per email — atomic UPSERT resets attempts on resend
    await query(
      `INSERT INTO verification_codes (email, code_hash, attempts, expires_at)
       VALUES ($1, $2, 0, NOW() + INTERVAL '10 minutes')
       ON CONFLICT (email) DO UPDATE
       SET code_hash = EXCLUDED.code_hash,
           attempts = 0,
           expires_at = EXCLUDED.expires_at`,
      [email, codeHash],
    );
  } catch (err) {
    console.error("[DB] Failed to persist verification code:", err);
    return new Response(JSON.stringify({ error: "Error al enviar el código. Intenta de nuevo." }), { status: 500 });
  }

  const apiKey = import.meta.env.RESEND_API_KEY;

  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mtsprz <cotizaciones@mtsprz.org>",
        to: email,
        subject: "Tu código de verificación — Mtsprz",
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0b;color:#fafafa;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
          <p style="font-size:14px;color:rgba(250,250,250,0.6);margin:0 0 24px">Usa este código para verificar tu correo y recibir tu cotización personalizada.</p>
          <div style="text-align:center;font-size:36px;font-weight:700;letter-spacing:8px;color:#6366f1;padding:16px 0;margin:0 0 24px;background:rgba(99,102,241,0.08);border-radius:12px">${code}</div>
          <p style="font-size:12px;color:rgba(250,250,250,0.4);margin:0">Código válido por 10 minutos. Si no solicitaste esto, ignora este mensaje.</p>
        </div>`,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Resend]", err);
      // Rollback: remove persisted code so it can never be used
      await query("DELETE FROM verification_codes WHERE email = $1", [email]).catch(() => {});
      return new Response(JSON.stringify({ error: "Error al enviar el código. Intenta de nuevo." }), { status: 500 });
    }
  } else {
    console.log(`[DEV] Verification code for ${email}: ${code}`);
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
