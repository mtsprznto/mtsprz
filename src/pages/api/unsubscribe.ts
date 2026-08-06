/**
 * GET /api/unsubscribe?token=… · Baja de la secuencia de nurturing (J4).
 *
 * Cada email de nurturing incluye un link con el token único de la secuencia.
 * El token se regenera al reprogramar (scheduleSequence) → un link viejo
 * no cancela una secuencia nueva.
 */

import type { APIRoute } from "astro";
import { query, initDb } from "../../lib/db";

export const prerender = false;

function html(message: string, code = 200): Response {
  return new Response(
    `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Baja de correos · Mtsprz</title>
</head>
<body style="margin:0;background:#0a0a0b;color:#fafafa;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="max-width:480px;padding:32px;background:#111113;border-radius:16px;border:1px solid rgba(255,255,255,0.06);text-align:center">
    <div style="width:48px;height:48px;margin:0 auto 16px;background:rgba(99,102,241,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    </div>
    <h1 style="margin:0 0 8px;font-size:18px;font-weight:700">${message}</h1>
    <p style="margin:0;font-size:14px;color:rgba(250,250,250,0.6)">Mtsprz · Soluciones Digitales · Puerto Varas</p>
  </div>
</body>
</html>`,
    { status: code, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token")?.trim() ?? "";
  if (!token || token.length > 64) {
    return html("Link de baja inválido.", 400);
  }

  try {
    await initDb();
    await query(
      `UPDATE lead_sequences
       SET status = 'cancelled', last_sent_at = COALESCE(last_sent_at, NOW())
       WHERE unsubscribe_token = $1`,
      [token]
    );
    return html("Te has dado de baja. Ya no recibirás más correos de la secuencia.");
  } catch (err) {
    console.error("[Unsubscribe] Error:", err);
    return html("Ocurrió un error. Intenta de nuevo o escríbenos a contacto@mtsprz.org.", 500);
  }
};
