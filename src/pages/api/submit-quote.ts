import type { APIRoute } from "astro";
import { query, initDb } from "../../lib/db";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: { email?: string; services?: { id: string; name: string; price: number }[]; total?: number; message?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const services = body.services;
  const total = body.total;

  if (!email || !services || !total) {
    return new Response(JSON.stringify({ error: "Email, servicios y total requeridos" }), { status: 400 });
  }

  try {
    await initDb();
    await query(
      "INSERT INTO quote_requests (email, services, total, message) VALUES ($1, $2, $3, $4)",
      [email, JSON.stringify(services), total, body.message || null]
    );
  } catch (err) {
    console.error("[DB] Failed to save quote:", err);
    return new Response(JSON.stringify({ error: "Error al guardar la cotización" }), { status: 500 });
  }

  const apiKey = import.meta.env.RESEND_API_KEY;
  const toEmail = import.meta.env.RESEND_TO || "contacto@mtsprz.org";
  const fromEmail = import.meta.env.RESEND_FROM || "cotizaciones@mtsprz.org";

  if (apiKey) {
    const servicesHtml = services
      .map((s) => `<tr><td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#fafafa">${s.name}</td><td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06);color:#fafafa;text-align:right">$${(s.price / 1000).toFixed(0)}k</td></tr>`)
      .join("");

    const emailHtml = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0b;color:#fafafa;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(99,102,241,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          </div>
          <h2 style="margin:0;font-size:18px;font-weight:700;letter-spacing:-0.5px">Nueva Cotización Recibida</h2>
        </div>
        <p style="font-size:13px;color:rgba(250,250,250,0.5);margin:0 0 16px">
          <strong style="color:#fafafa">${email}</strong> ha solicitado una cotización desde la web.
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <thead>
            <tr><th style="padding:8px 12px;text-align:left;color:rgba(250,250,250,0.4);font-size:11px;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.06)">Servicio</th><th style="padding:8px 12px;text-align:right;color:rgba(250,250,250,0.4);font-size:11px;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.06)">Precio</th></tr>
          </thead>
          <tbody>${servicesHtml}</tbody>
        </table>
        <div style="text-align:right;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)">
          <span style="font-size:13px;color:rgba(250,250,250,0.5)">Total: </span>
          <strong style="font-size:18px;color:#6366f1">$${(total / 1000).toFixed(0)}k</strong>
        </div>
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
          subject: `Nueva cotización de ${email} — $${(total / 1000).toFixed(0)}k`,
          html: emailHtml,
        }),
      });
    } catch (err) {
      console.error("[Resend] Failed to send quote notification:", err);
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
