import type { APIRoute } from "astro";
import { query, initDb } from "../../lib/db";
import { sendEmail } from "../../lib/mail";
import { sanitizeBody, sanitizeHtml, validateBodySize, validateEmail } from "../../lib/validators";
import { checkRateLimit } from "../../lib/rate-limit";
import { normalizePhone } from "../../lib/phone";

export const prerender = false;

const WHATSAPP_MTS = "56966929818";

/**
 * Packs con descuento · espejo de src/pages/cotizar.astro.
 * El descuento se recalcula SERVER-SIDE contra estos packs: el cliente
 * jamás decide el monto; solo declara qué servicios seleccionó.
 */
const QUOTE_PACKS: { ids: string[]; discount: number }[] = [
  // Pack Digital Completo · descuento alineado con src/data/pricing.json (350.000)
  { ids: ["web-profesional", "seo-local", "bot-whatsapp"], discount: 350000 },
  { ids: ["landing", "logo-brand", "social-media"], discount: 150000 },
  { ids: ["seo-audit", "seo-local", "seo-mensual"], discount: 100000 },
];

/** Recalcula el descuento de pack legítimo a partir de los slugs seleccionados. */
function computePackDiscount(serviceIds: string[]): number {
  for (const pack of QUOTE_PACKS) {
    if (pack.ids.every((id) => serviceIds.includes(id))) return pack.discount;
  }
  return 0;
}

export const POST: APIRoute = async ({ request }) => {
  let body: {
    email?: string;
    services?: { id: string; name: string; price: number }[];
    total?: number;
    message?: string;
    phone?: string;
    discount?: number;
  };
  try {
    body = sanitizeBody(await request.json());
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  if (!validateBodySize(body)) {
    return new Response(JSON.stringify({ error: "Solicitud demasiado grande" }), { status: 413 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const services = body.services;
  const total = body.total;

  if (!email || !validateEmail(email)) {
    return new Response(JSON.stringify({ error: "Email inválido" }), { status: 400 });
  }

  if (!Array.isArray(services) || services.length === 0 || services.length > 50) {
    return new Response(JSON.stringify({ error: "Lista de servicios inválida" }), { status: 400 });
  }

  // Validate each service entry
  for (const s of services) {
    if (typeof s !== "object" || !s || typeof s.id !== "string" || typeof s.name !== "string" || typeof s.price !== "number") {
      return new Response(JSON.stringify({ error: "Formato de servicio inválido" }), { status: 400 });
    }
    if (s.name.length > 200 || s.id.length > 200) {
      return new Response(JSON.stringify({ error: "Nombre de servicio demasiado largo" }), { status: 400 });
    }
  }

  if (typeof total !== "number" || total < 0 || total > 100_000_000 || !Number.isFinite(total)) {
    return new Response(JSON.stringify({ error: "Total inválido" }), { status: 400 });
  }

  // A2: teléfono opcional · normalizar a wa.me (56 + dígitos)
  let phone: string | null = null;
  if (body.phone !== undefined && body.phone !== null && body.phone !== "") {
    if (typeof body.phone !== "string" || body.phone.length > 50) {
      return new Response(JSON.stringify({ error: "Teléfono inválido" }), { status: 400 });
    }
    phone = normalizePhone(body.phone);
    if (!phone || phone.length < 9 || phone.length > 15) {
      return new Response(JSON.stringify({ error: "Teléfono inválido" }), { status: 400 });
    }
  }

  // A3: descuento · recalcular server-side, ignorar lo que mande el cliente
  const packDiscount = computePackDiscount(services.map((s) => s.id));
  const discount = packDiscount;
  const totalFinal = total - discount;

  // 🛡️ Rate limit: max 5 quotes per hour per email
  const rateCheck = checkRateLimit(`submit-quote:email:${email}`, 5, 3600_000);
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: "Demasiadas cotizaciones solicitadas. Intenta en 1 hora." }), { status: 429 });
  }

  try {
    await initDb();

    // Verificar que el email esté verificado
    const verResult = await query("SELECT 1 FROM verified_emails WHERE email = $1", [email]);
    if (verResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Email no verificado. Debes verificar tu correo antes de cotizar." }), { status: 403 });
    }

    await query(
      "INSERT INTO quote_requests (email, services, total, message, phone, discount) VALUES ($1, $2, $3, $4, $5, $6)",
      [email, JSON.stringify(services), totalFinal, body.message || null, phone, discount]
    );
  } catch (err) {
    console.error("[DB] Failed to save quote:", err);
    return new Response(JSON.stringify({ error: "Error al guardar la cotización" }), { status: 500 });
  }

  const apiKey = import.meta.env.RESEND_API_KEY;
  const toEmail = import.meta.env.RESEND_TO || "contacto@mtsprz.org";
  const fromEmail = import.meta.env.RESEND_FROM || "cotizaciones@mtsprz.org";

  // A2: deep link WhatsApp para contactar al cliente desde el email del admin
  const phoneDisplay = phone
    ? `<p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 6px;line-height:1.6"><strong style="color:#fafafa">Teléfono:</strong> +${sanitizeHtml(phone)}</p>`
    : "";
  const phoneWaLink = phone
    ? `<a href="https://wa.me/${phone}?text=${encodeURIComponent("Hola, vi tu cotización en mtsprz.org y quiero avanzar con tu proyecto")}" style="display:inline-block;padding:12px 24px;border-radius:9999px;font-size:13px;font-weight:600;color:#0a0a0b;text-decoration:none;background:#25D366">Contactar por WhatsApp</a>`
    : "";

  if (apiKey) {
    const servicesHtml = services
      .map((s) => `<tr><td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#fafafa">${sanitizeHtml(s.name)}</td><td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#fafafa;text-align:right">$${(s.price / 1000).toFixed(0)}k</td></tr>`)
      .join("");

    const discountHtml =
      discount > 0
        ? `<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="font-size:13px;color:#34d399">Descuento pack</span><strong style="font-size:13px;color:#34d399">-$${(discount / 1000).toFixed(0)}k</strong></div>`
        : "";

    const emailHtml = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0b;color:#fafafa;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(99,102,241,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </div>
          <h2 style="margin:0;font-size:18px;font-weight:700;letter-spacing:-0.5px">Nueva Cotización Recibida</h2>
        </div>
        <p style="font-size:13px;color:rgba(250,250,250,0.5);margin:0 0 16px">
          <strong style="color:#fafafa">${sanitizeHtml(email)}</strong> ha solicitado una cotización desde la web.
        </p>
        ${phoneDisplay}
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead>
            <tr><th style="padding:8px 12px;text-align:left;color:rgba(250,250,250,0.4);font-size:11px;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.06)">Servicio</th><th style="padding:8px 12px;text-align:right;color:rgba(250,250,250,0.4);font-size:11px;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.06)">Precio</th></tr>
          </thead>
          <tbody>${servicesHtml}</tbody>
        </table>
        <div style="text-align:right;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)">
          ${discountHtml}
          <span style="font-size:13px;color:rgba(250,250,250,0.5)">Total: </span>
          <strong style="font-size:18px;color:#6366f1">$${(totalFinal / 1000).toFixed(0)}k</strong>
        </div>
        ${phoneWaLink ? `<div style="text-align:center;margin-top:20px">${phoneWaLink}</div>` : ""}
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:20px 0" />
        <p style="font-size:11px;color:rgba(250,250,250,0.3);margin:0;text-align:center">
          Cotización generada desde mtsprz.org/cotizar
        </p>
      </div>
    `;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Mtsprz <${fromEmail}>`,
          to: toEmail,
          replyTo: email,
          subject: `Nueva cotización de ${email} · $${(totalFinal / 1000).toFixed(0)}k`,
          html: emailHtml,
        }),
      });
    } catch (err) {
      console.error("[Resend] Failed to send quote notification:", err);
    }

    // Enviar confirmación al solicitante
    const confirmHtml = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0b;color:#fafafa;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(99,102,241,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style="margin:0;font-size:18px;font-weight:700;letter-spacing:-0.5px">Cotización Recibida</h2>
        </div>
        <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 16px;line-height:1.6">
          Hola,
        </p>
        <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 16px;line-height:1.6">
          Hemos recibido tu solicitud de cotización en <strong style="color:#fafafa">Mtsprz</strong>. 
          Estos son los servicios que seleccionaste:
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead>
            <tr><th style="padding:8px 12px;text-align:left;color:rgba(250,250,250,0.4);font-size:11px;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.06)">Servicio</th><th style="padding:8px 12px;text-align:right;color:rgba(250,250,250,0.4);font-size:11px;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.06)">Precio</th></tr>
          </thead>
          <tbody>${servicesHtml}</tbody>
        </table>
        <div style="text-align:right;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)">
          ${discountHtml}
          <span style="font-size:13px;color:rgba(250,250,250,0.5)">Total estimado: </span>
          <strong style="font-size:18px;color:#6366f1">$${(totalFinal / 1000).toFixed(0)}k</strong>
        </div>
        <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:20px 0 0;line-height:1.6">
          Un miembro de nuestro equipo te contactará pronto para resolver dudas y comenzar con tu proyecto.
        </p>
        <div style="text-align:center;margin-top:20px">
          <a href="https://wa.me/${WHATSAPP_MTS}?text=${encodeURIComponent("Hola Mtsprz, envié una cotización desde la web y quiero avanzar")}" style="display:inline-block;padding:14px 32px;border-radius:9999px;font-size:14px;font-weight:600;color:#0a0a0b;text-decoration:none;background:#25D366">
            Escríbenos por WhatsApp
          </a>
        </div>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0" />
        <p style="font-size:11px;color:rgba(250,250,250,0.3);margin:0;text-align:center">
          Mtsprz · Soluciones Digitales · Puerto Varas, Región de Los Lagos · contacto@mtsprz.org
        </p>
      </div>
    `;

    try {
      await sendEmail({
        to: email,
        subject: `Hemos recibido tu cotización · Mtsprz`,
        html: confirmHtml,
        replyTo: "contacto@mtsprz.org",
      });
    } catch (err) {
      console.error("[Resend] Failed to send quote confirmation to requester:", err);
    }
  }

  return new Response(JSON.stringify({ success: true, total: totalFinal, discount }), { status: 200 });
};
