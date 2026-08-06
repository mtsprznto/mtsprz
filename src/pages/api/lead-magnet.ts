/**
 * POST /api/lead-magnet · Captura de email por lead magnet (J4).
 *
 * Recibe { email, slug } desde los formularios de /recursos y /recursos/[slug].
 * 1. Valida + rate limit (3/hora/IP, patrón del resto de la app)
 * 2. Registra la descarga en lead_magnet_downloads
 * 3. Programa la secuencia de nurturing (día 3 → 7 → 14)
 * 4. Envía el email de entrega (resumen + CTA diagnóstico)
 */

import type { APIRoute } from "astro";
import { query, initDb } from "../../lib/db";
import { sendEmail } from "../../lib/mail";
import { checkRateLimit } from "../../lib/rate-limit";
import { getLeadMagnetBySlug } from "../../lib/marketing/lead-magnets";
import { scheduleSequence } from "../../lib/marketing/sequences";
import { leadMagnetEmail } from "../../lib/marketing/templates";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit(`lead-magnet:ip:${clientIp}`, 3, 3600_000);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Demasiadas solicitudes. Intenta en 1 hora." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const slug = String(body.slug || "").trim();

  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: "Correo electrónico inválido" }), { status: 400 });
  }
  if (email.length > 254) {
    return new Response(JSON.stringify({ error: "Correo demasiado largo" }), { status: 400 });
  }

  const magnet = getLeadMagnetBySlug(slug);
  if (!magnet) {
    return new Response(JSON.stringify({ error: "Recurso no encontrado" }), { status: 404 });
  }

  try {
    await initDb();

    // 1. Registrar descarga (si el email ya descargó este magnet, se ignora: sin spam)
    await query(
      `INSERT INTO lead_magnet_downloads (email, magnet_id, status)
       VALUES ($1, $2, 'delivered')
       ON CONFLICT DO NOTHING`,
      [email, magnet.id]
    );

    // 2. Programar secuencia de nurturing (idempotente por email+sequence_id)
    await scheduleSequence(email);

    // 3. Email de entrega: resumen + CTA diagnóstico
    await sendEmail({
      to: email,
      subject: `Tu guía está lista · ${magnet.title}`,
      html: leadMagnetEmail(email, magnet.title, magnet.slug, [magnet.promise, magnet.outcome]),
      fromName: "Mtsprz",
    });

    return new Response(
      JSON.stringify({ success: true, url: `/recursos/${magnet.slug}` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[LeadMagnet] Error:", err);
    return new Response(JSON.stringify({ error: "Error al procesar la solicitud" }), { status: 500 });
  }
};
