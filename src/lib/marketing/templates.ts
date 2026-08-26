/**
 * Marketing · Plantillas de email (estilo dark Mtsprz, consistente con lib/mail).
 * Lead magnet delivery + secuencia de nurturing + solicitudes de reseña.
 */

import { sanitizeHtml } from "../validators";

const SITE = "https://mtsprz.org";

/** Wrapper dark consistente con los emails de contratos. */
function layout(title: string, body: string, footer = "Mtsprz · Soluciones Digitales · Puerto Varas, Región de Los Lagos · contacto@mtsprz.org"): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0b;color:#fafafa;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,0.06)">
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:48px;height:48px;margin:0 auto 12px;background:rgba(99,102,241,0.1);border-radius:12px;display:flex;align-items:center;justify-content:center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <h2 style="margin:0;font-size:18px;font-weight:700;letter-spacing:-0.5px">${title}</h2>
      </div>
      ${body}
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0" />
      <p style="font-size:11px;color:rgba(250,250,250,0.3);margin:0;text-align:center">${footer}</p>
    </div>
  `;
}

function ctaButton(href: string, label: string, color = "linear-gradient(135deg,#6366f1,#8b5cf6)"): string {
  return `<div style="text-align:center;margin:20px 0">
    <a href="${sanitizeHtml(href)}" style="display:inline-block;padding:14px 32px;border-radius:9999px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;background:${color}">${sanitizeHtml(label)}</a>
  </div>`;
}

function paragraph(text: string, strong = ""): string {
  return `<p style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 16px;line-height:1.6">${strong ? `<strong style="color:#fafafa">${strong}</strong> ` : ""}${text}</p>`;
}

/* ── 1. Entrega de lead magnet ── */

export function leadMagnetEmail(email: string, magnetTitle: string, magnetSlug: string, summaryLines: string[]): string {
  const name = sanitizeHtml(email.split("@")[0]);
  const title = sanitizeHtml(magnetTitle);
  const url = `${SITE}/recursos/${sanitizeHtml(magnetSlug)}`;
  const bullets = summaryLines
    .map((l) => `<li style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 8px;line-height:1.6">${sanitizeHtml(l)}</li>`)
    .join("");

  return layout(
    "Tu guía está lista",
    `${paragraph(`Hola ${name},`, "¡")}
     ${paragraph(`Te enviamos el resumen de <strong style="color:#fafafa">${title}</strong> que pediste. El contenido completo está en la web (así siempre lo encuentras):`)}
     <ul style="padding-left:20px;margin:0 0 16px">${bullets}</ul>
     ${ctaButton(url, "Ver guía completa")}
     ${paragraph("Si quieres, revisamos tu caso en 20 minutos: te decimos 3 cosas concretas para vender más esta semana.")}
     ${ctaButton(`${SITE}/diagnostico`, "Quiero mi diagnóstico gratis", "linear-gradient(135deg,#25D366,#128C7E)")}`
  );
}

/* ── 2. Secuencia de nurturing (día 3 / 7 / 14) ── */

function unsubscribeFooter(unsubscribeUrl: string): string {
  return `¿Ya no quieres recibir estos correos? <a href="${sanitizeHtml(unsubscribeUrl)}" style="color:rgba(250,250,250,0.5);text-decoration:underline">Darte de baja</a>.`;
}

const DEFAULT_FOOTER = "Mtsprz · Soluciones Digitales · Puerto Varas, Región de Los Lagos · contacto@mtsprz.org";

function footer(unsubscribeUrl?: string): string {
  return unsubscribeUrl ? `${DEFAULT_FOOTER} · ${unsubscribeFooter(unsubscribeUrl)}` : DEFAULT_FOOTER;
}

export function sequenceEmail(step: number, name: string, unsubscribeUrl?: string): string {
  const foot = footer(unsubscribeUrl);
  if (step === 1) {
    return layout(
      "Un caso real que hicimos en el sur",
      `${paragraph(`Hola ${sanitizeHtml(name)},`)}
       ${paragraph("Nuestro portfolio incluye proyectos propios y herramientas de IA (educación, contraseñas, marketing). Esto demuestra que el stack técnico existe y es real:", "💡")}
       <ul style="padding-left:20px;margin:0 0 16px">
         <li style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 8px;line-height:1.6">Web ultra rápida (Astro, <1.5s) · clave para convertir y para Google</li>
         <li style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 8px;line-height:1.6">WhatsApp API que responde solo y agenda</li>
         <li style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 8px;line-height:1.6">IA aplicada (OCR/RAG) para automatizar procesos</li>
       </ul>
       ${ctaButton(`${SITE}/casos`, "Ver casos")}`,
      foot
    );
  }

  if (step === 2) {
    return layout(
      "3 cosas que tu competencia no hace (aún)",
      `${paragraph(`Hola ${sanitizeHtml(name)},`)}
       ${paragraph("Mientras decides, te dejamos 3 tácticas que la mayoría de las pymes del sur no aplica:", "🎯")}
       <ul style="padding-left:20px;margin:0 0 16px">
         <li style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 8px;line-height:1.6"><strong style="color:#fafafa">Reseñas:</strong> 47% de los clientes descarta negocios con menos de 20 reseñas. Pide reseñas activamente.</li>
         <li style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 8px;line-height:1.6"><strong style="color:#fafafa">WhatsApp:</strong> el cliente del sur vive en WhatsApp. Automatiza la primera respuesta.</li>
         <li style="font-size:14px;color:rgba(250,250,250,0.7);margin:0 0 8px;line-height:1.6"><strong style="color:#fafafa">Precios visibles:</strong> publicar precios en la web filtra y ahorra tiempo.</li>
       </ul>
       ${ctaButton(`${SITE}/diagnostico`, "Reviso mi negocio gratis")}`,
      foot
    );
  }

  return layout(
    "Último paso: tu diagnóstico gratis",
    `${paragraph(`Hola ${sanitizeHtml(name)},`)}
     ${paragraph("Este es el momento: los negocios con web rápida + reseñas + WhatsApp + visibilidad en IA (ChatGPT/Perplexity) están capturando clientes que antes iban a la competencia.", "⏳")}
     ${paragraph("Te ofrecemos un diagnóstico de 20 minutos, sin compromiso: revisamos tu web, tu Google Maps y tu presencia en IA, y te dejamos 3 acciones concretas.")}
     ${ctaButton(`${SITE}/diagnostico`, "Agendar mi diagnóstico gratis", "linear-gradient(135deg,#25D366,#128C7E)")}
     ${paragraph("Si no es buen momento, responde este correo y lo pausamos.", "Nota:")}`,
    foot
  );
}

/* ── 2b. Secuencia día 21: testimonios + oferta ── */

export function sequenceEmailStep4(name: string, unsubscribeUrl?: string): string {
  const foot = footer(unsubscribeUrl);
  return layout(
    "Lo que dicen nuestros clientes",
    `${paragraph(`Hola ${sanitizeHtml(name)},`)}
     ${paragraph("Hemos trabajado con negocios de la Región de Los Lagos. Esto es lo que dicen:", "💬")}
     <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;margin:0 0 16px">
       <p style="font-size:13px;color:rgba(250,250,250,0.6);margin:0 0 8px;font-style:italic;line-height:1.6">"Destaco especialmente su habilidad para el desarrollo de algoritmos, su disposición para enfrentar nuevos desafíos y su constante orientación hacia la mejora continua."</p>
       <p style="font-size:11px;color:rgba(250,250,250,0.3);margin:0">— Pedro Collado Quinteros, Maxam</p>
     </div>
     ${paragraph("Si quieres algo similar para tu negocio, tenemos una oferta especial para nuevos clientes:", "🎁")}
     ${paragraph("<strong style='color:#10b981'>-30% en tu primer proyecto</strong> · Landing, web o automatización · Solo 3 cupos disponibles")}
     ${ctaButton(`${SITE}/diagnostico`, "Reservar mi cupo", "linear-gradient(135deg,#25D366,#128C7E)")}
     ${paragraph("Esta oferta vence en 7 días. Si ya tomaste una decisión, perfecto — nos vemos del otro lado.", "Nota:")}`,
    foot
  );
}

/* ── 3. Solicitudes de reseña (J1) ── */

export function reviewRequestEmail(clientName: string, project: string, day: number): string {
  const reviewUrl = import.meta.env.GOOGLE_REVIEW_URL || "https://g.page/r/CTtH8EKjoy9cEBM/review";
  return layout(
    "¿Nos ayudas con una reseña?",
    `${paragraph(sanitizeHtml(clientName), `Hola ${""}`)}
     ${paragraph(`Esperamos que estés disfrutando de ${sanitizeHtml(project)}. Tu opinión ayuda a que otros negocios del sur confíen en trabajar con nosotros.`, "🙌")}
     ${paragraph(`Tómate 30 segundos · cuenta tu experiencia y qué fue lo que más te gustó:`)}
     ${ctaButton(reviewUrl, "Dejar reseña en Google", "linear-gradient(135deg,#FBBC05,#4285F4)")}
     ${day === 10 ? paragraph("Si ya la dejaste, gracias · ignora este mensaje.", "Nota:") : ""}`
  );
}
