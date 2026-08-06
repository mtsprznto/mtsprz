import { Resend } from "resend";
import { sanitizeHtml } from "./validators";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  /** Nombre visible del remitente. Default: "Mtsprz Contratos" (contratos). Marketing pasa "Mtsprz". */
  fromName?: string;
  /** Email remitente. Default: RESEND_FROM || "contratos@mtsprz.org". */
  fromEmail?: string;
  /** Headers extra (ej: List-Unsubscribe para cumplimiento Ley 21.719). */
  headers?: Record<string, string>;
}

/** Devuelve true si el email se envió (o se simuló en dev sin API key); false solo si falló de verdad. */
export async function sendEmail({ to, subject, html, replyTo, fromName, fromEmail, headers }: SendEmailParams): Promise<boolean> {
  const apiKey = import.meta.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[Mail] No RESEND_API_KEY. Would send to ${to}: ${subject}`);
    return true;
  }

  const resend = new Resend(apiKey);
  const from = fromEmail || import.meta.env.RESEND_FROM || "contratos@mtsprz.org";

  try {
    await resend.emails.send({
      from: `${fromName || "Mtsprz Contratos"} <${from}>`,
      to,
      replyTo: replyTo || from,
      subject,
      html,
      headers,
    });
    console.log(`[Mail] Sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error(`[Mail] Failed to send to ${to}:`, err);
    return false;
  }
}

export function contractCreatedEmail(clientName: string, contractNumber: string, link: string): string {
  const name = sanitizeHtml(clientName);
  const num = sanitizeHtml(contractNumber);
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0b;color:#fafafa;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(99,102,241,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <h2 style="margin:0;font-size:18px;font-weight:700">Contrato por Firmar</h2>
      </div>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 16px;line-height:1.6">
        Hola <strong style="color:#fafafa">${name}</strong>,
      </p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 16px;line-height:1.6">
        Has recibido el contrato <strong style="color:#fafafa">${num}</strong> de parte de <strong style="color:#fafafa">Mtsprz</strong> para revisión y firma.
      </p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 24px;line-height:1.6">
        Haz clic en el botón para revisar y firmar el contrato de forma segura.
      </p>
      <div style="text-align:center">
        <a href="${sanitizeHtml(link)}" style="display:inline-block;padding:14px 32px;border-radius:9999px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;background:linear-gradient(135deg,#6366f1,#8b5cf6)">
          Revisar y Firmar Contrato
        </a>
      </div>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0" />
      <p style="font-size:11px;color:rgba(250,250,250,0.3);margin:0;text-align:center">
        Este enlace es personal e intransferible. Si no esperabas este correo, ignóralo.
      </p>
    </div>
  `;
}

export function contractSignedEmail(clientName: string, contractNumber: string, pdfLink: string): string {
  const name = sanitizeHtml(clientName);
  const num = sanitizeHtml(contractNumber);
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0b;color:#fafafa;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(16,185,129,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style="margin:0;font-size:18px;font-weight:700">Contrato Firmado</h2>
      </div>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 16px;line-height:1.6">
        El contrato <strong style="color:#fafafa">${num}</strong> ha sido firmado por ambas partes.
      </p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 24px;line-height:1.6">
        Puedes descargar el PDF firmado desde el siguiente enlace.
      </p>
      <div style="text-align:center">
        <a href="${sanitizeHtml(pdfLink)}" style="display:inline-block;padding:14px 32px;border-radius:9999px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;background:linear-gradient(135deg,#10b981,#059669)">
          Descargar PDF Firmado
        </a>
      </div>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0" />
      <p style="font-size:11px;color:rgba(250,250,250,0.3);margin:0;text-align:center">
        Contrato generado desde mtsprz.org
      </p>
    </div>
  `;
}

export function adminContractCompletedEmail(
  clientName: string,
  contractNumber: string,
  adminLink: string,
  pdfLink: string,
  clientEmail: string
): string {
  const name = sanitizeHtml(clientName);
  const num = sanitizeHtml(contractNumber);
  const email = sanitizeHtml(clientEmail);
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0b;color:#fafafa;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(16,185,129,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style="margin:0;font-size:18px;font-weight:700">Contrato Completado</h2>
      </div>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 16px;line-height:1.6">
        El contrato <strong style="color:#fafafa">${num}</strong> ha sido firmado por ambas partes.
      </p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 6px;line-height:1.6">
        <strong style="color:#fafafa">Cliente:</strong> ${name}
      </p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 24px;line-height:1.6">
        <strong style="color:#fafafa">Email:</strong> ${email}
      </p>
      <div style="text-align:center;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <a href="${sanitizeHtml(adminLink)}" style="display:inline-block;padding:14px 32px;border-radius:9999px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;background:linear-gradient(135deg,#6366f1,#8b5cf6)">
          Ver en Panel
        </a>
        <a href="${sanitizeHtml(pdfLink)}" style="display:inline-block;padding:14px 32px;border-radius:9999px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;background:linear-gradient(135deg,#10b981,#059669)">
          Descargar PDF
        </a>
      </div>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0" />
      <p style="font-size:11px;color:rgba(250,250,250,0.3);margin:0;text-align:center">
        Contrato generado desde mtsprz.org
      </p>
    </div>
  `;
}

export function leadReceivedEmail(name: string, serviceInterest: string | null): string {
  const safeName = sanitizeHtml(name);
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0b;color:#fafafa;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(37,211,102,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h2 style="margin:0;font-size:18px;font-weight:700">Recibimos tu solicitud</h2>
      </div>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 16px;line-height:1.6">
        Hola <strong style="color:#fafafa">${safeName}</strong>,
      </p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 16px;line-height:1.6">
        Gracias por pedir tu <strong style="color:#fafafa">diagnóstico digital gratis</strong>${serviceInterest ? ` (${sanitizeHtml(serviceInterest)})` : ""}.
        Te contactamos por WhatsApp en menos de 24 horas hábiles para agendar tu llamada de 20 minutos.
      </p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 24px;line-height:1.6">
        Mientras tanto, revisa tu presencia en Google Maps y ChatGPT: 8 de cada 10 clientes buscan ahí antes de comprar.
      </p>
      <div style="text-align:center">
        <a href="https://mtsprz.org/diagnostico" style="display:inline-block;padding:14px 32px;border-radius:9999px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;background:linear-gradient(135deg,#25D366,#128C7E)">
          Qué incluye el diagnóstico
        </a>
      </div>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0" />
      <p style="font-size:11px;color:rgba(250,250,250,0.3);margin:0;text-align:center">
        Mtsprz · Soluciones Digitales · Puerto Varas, Región de Los Lagos · contacto@mtsprz.org
      </p>
    </div>
  `;
}

export function adminNewLeadEmail(lead: {
  name: string;
  phone: string | null;
  email: string | null;
  source: string;
  serviceInterest: string | null;
  message: string | null;
  createdAt: string;
}): string {
  const name = sanitizeHtml(lead.name);
  const phone = sanitizeHtml(lead.phone || "");
  const email = sanitizeHtml(lead.email || "");
  const source = sanitizeHtml(lead.source);
  const interest = sanitizeHtml(lead.serviceInterest || "No especificado");
  const message = sanitizeHtml((lead.message || "").slice(0, 500)).replace(/\n/g, "<br />");
  const date = sanitizeHtml(new Date(lead.createdAt).toLocaleString("es-CL", { timeZone: "America/Santiago" }));
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0b;color:#fafafa;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(99,102,241,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>
        </div>
        <h2 style="margin:0;font-size:18px;font-weight:700">Nuevo Lead</h2>
      </div>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 6px;line-height:1.6"><strong style="color:#fafafa">Nombre:</strong> ${name}</p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 6px;line-height:1.6"><strong style="color:#fafafa">WhatsApp:</strong> ${phone}</p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 6px;line-height:1.6"><strong style="color:#fafafa">Email:</strong> ${email}</p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 6px;line-height:1.6"><strong style="color:#fafafa">Interés:</strong> ${interest}</p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 6px;line-height:1.6"><strong style="color:#fafafa">Fuente:</strong> ${source}</p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 6px;line-height:1.6"><strong style="color:#fafafa">Fecha:</strong> ${date}</p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:16px 0 0;line-height:1.6"><strong style="color:#fafafa">Mensaje:</strong></p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:4px 0 24px;line-height:1.6;background:rgba(255,255,255,0.03);padding:12px;border-radius:8px">${message}</p>
      <div style="text-align:center">
        <a href="https://mtsprz.org/admin/leads" style="display:inline-block;padding:14px 32px;border-radius:9999px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;background:linear-gradient(135deg,#6366f1,#8b5cf6)">
          Ver en Panel
        </a>
      </div>
    </div>
  `;
}

export function adminNewContractNotification(clientName: string, contractNumber: string, link: string): string {
  const name = sanitizeHtml(clientName);
  const num = sanitizeHtml(contractNumber);
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0b;color:#fafafa;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(99,102,241,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </div>
        <h2 style="margin:0;font-size:18px;font-weight:700">Contrato Enviado a Cliente</h2>
      </div>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 16px;line-height:1.6">
        El contrato <strong style="color:#fafafa">${num}</strong> ha sido enviado a <strong style="color:#fafafa">${name}</strong>.
      </p>
      <p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 24px;line-height:1.6">
        Revisa su estado en el panel de administración.
      </p>
      <div style="text-align:center">
        <a href="${sanitizeHtml(link)}" style="display:inline-block;padding:14px 32px;border-radius:9999px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;background:linear-gradient(135deg,#6366f1,#8b5cf6)">
          Ver en Panel
        </a>
      </div>
    </div>
  `;
}
