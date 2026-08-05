/**
 * GET /api/cron/sequences — Cron Vercel: procesa secuencias de nurturing vencidas.
 *
 * Seguridad: si CRON_SECRET está definido, exige Authorization: Bearer <secret>.
 * Vercel Cron envía ese header automáticamente (config en vercel.json "crons").
 * Sin secret configurado → solo acepta en entorno de desarrollo.
 */

import type { APIRoute } from "astro";
import { processDueSequences } from "../../../lib/marketing/sequences";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const secret = import.meta.env.CRON_SECRET as string | undefined;

  if (secret) {
    const auth = request.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }
  } else if (import.meta.env.PROD) {
    // En producción, sin CRON_SECRET definido → no exponer el cron
    return new Response(JSON.stringify({ error: "CRON_SECRET no configurado" }), { status: 503 });
  }

  try {
    const sent = await processDueSequences();
    return new Response(JSON.stringify({ ok: true, sent }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[Cron] Sequences error:", err);
    return new Response(JSON.stringify({ error: "Error en cron" }), { status: 500 });
  }
};
