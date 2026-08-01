/**
 * Evolution API client + WhatsApp auto-responder engine.
 * Docs: https://doc.evolution-api.com/v2.3/api
 */

import type { LeadRecord } from "./leads";

const WABA_URL = import.meta.env.WABA_URL || "http://localhost:8080";
const WABA_API_KEY = import.meta.env.WABA_API_KEY || "mtsprz-evolution-key-2026";
const INSTANCE = "mtsprz";
const ADMIN_NUMBER = "56966929818";
// Sender por navegador real (web.whatsapp.com oficial — anti-detección).
// Script: scripts/whatsapp-browser/sender.py (uv run). Desactiva con "".
const WHATSAPP_BROWSER_URL = import.meta.env.WHATSAPP_BROWSER_URL || "http://127.0.0.1:8899";

/* ── Types ── */

export interface SendMessageResult {
  key?: { remoteJid: string; fromMe: boolean; id: string };
  status: string;
  messageType?: string;
  messageTimestamp?: number;
  instanceId?: string;
}

export interface WebhookPayload {
  event: "MESSAGES_UPSERT";
  instance: string;
  data: {
    key: { remoteJid: string; fromMe: boolean; id: string; participant?: string };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text: string };
      imageMessage?: { caption?: string };
      documentMessage?: { caption?: string };
    };
    messageType: "conversation" | "extendedTextMessage" | "imageMessage" | "documentMessage";
    messageTimestamp: number;
  };
}

/* ── HTTP client ── */

async function evolutionPost(endpoint: string, body: unknown): Promise<Response> {
  return fetch(`${WABA_URL}${endpoint}`, {
    method: "POST",
    headers: {
      apikey: WABA_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/* ── Sending ── */

/** Estado de conexión de la instancia (open/close) — pre-validación de envíos */
export async function getConnectionState(): Promise<{ state: string; reason?: string }> {
  try {
    const res = await fetch(`${WABA_URL}/instance/connectionState/${INSTANCE}`, {
      headers: { apikey: WABA_API_KEY },
    });
    if (!res.ok) return { state: "unknown" };
    const data = await res.json();
    const state = data?.instance?.state || "unknown";
    const reason = data?.instance?.disconnectionReasonCode ? `(código ${data.instance.disconnectionReasonCode})` : undefined;
    return { state, reason };
  } catch {
    return { state: "unknown" };
  }
}

/** Envía vía navegador real (web.whatsapp.com oficial) — puente a sender.py */
export async function sendTextBrowser(number: string, text: string): Promise<SendMessageResult> {
  if (!WHATSAPP_BROWSER_URL) {
    throw new Error("WHATSAPP_BROWSER_URL vacío — sender browser desactivado");
  }
  const res = await fetch(`${WHATSAPP_BROWSER_URL}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ number, text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sender browser error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function sendText(number: string, text: string): Promise<SendMessageResult> {
  // Browser-first: el cliente oficial (Chrome real) entrega sin shadow-block.
  if (WHATSAPP_BROWSER_URL) {
    try {
      return await sendTextBrowser(number, text);
    } catch (err) {
      throw new Error(
        `Sender browser no disponible (${(err as Error).message}). Arranca el script: cd scripts/whatsapp-browser && uv run python sender.py`
      );
    }
  }

  // Fallback Evolution/Baileys (solo si WHATSAPP_BROWSER_URL="").
  const state = await getConnectionState();
  if (state.state !== "open") {
    throw new Error(
      `Instancia WhatsApp desconectada (${state.state} ${state.reason || ""}). Reconecta escaneando el QR en http://localhost:8080/manager`
    );
  }

  const res = await evolutionPost(`/message/sendText/${INSTANCE}`, {
    number,
    text,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API error ${res.status}: ${err}`);
  }
  return res.json();
}

/* ── Auto-responder engine ── */

const SERVICE_RESPONSES: Record<string, string> = {
  web: `🌟 *Mtsprz — Desarrollo Web*

Creamos sitios web profesionales para pymes chilenas:
• Landing pages desde $150.000
• Sitios institucionales desde $350.000
• Tiendas online desde $500.000
• SEO técnico incluido en todos los planes
• Hosting + dominio el 1er año gratis

¿Te gustaría agendar una llamada gratis de 15 min para ver tu proyecto?`,

  seo: `🔍 *Mtsprz — SEO y Posicionamiento*

Aparece en Google cuando tus clientes te buscan:
• Auditoría SEO técnica desde $80.000
• SEO Local (Google Maps) desde $50.000
• Estrategia de contenido + GEO para IA
• Reportes mensuales de posicionamiento

¿Qué tipo de negocio tienes? Te recomiendo el plan ideal.`,

  whatsapp: `📱 *Mtsprz — WhatsApp Business*

Automatiza tus ventas por WhatsApp:
• Bot automatizado con respuestas inteligentes
• Catálogo digital 24/7
• Mensajes masivos segmentados
• Integración con tu sitio web
• Desde $120.000/mes

¿Cuántos mensajes recibes al día?`,

  automation: `🤖 *Mtsprz — Automatización con IA*

Deja que la tecnología haga el trabajo pesado:
• Chatbots con IA para atención al cliente
• Automatización de procesos administrativos
• Integración de sistemas (CRM, facturación, email)
• Agentes de IA para tareas repetitivas

Cuéntame qué proceso te gustaría automatizar.`,

  marketing: `📢 *Mtsprz — Marketing Digital*

Haz crecer tu negocio con estrategia digital:
• Gestión de redes sociales
• Google Ads con presupuestos ajustados
• Email marketing automatizado
• Estrategia de contenido + calendario editorial
• Desde $200.000/mes

¿En qué red social te gustaría empezar?`,
};

const KEYWORD_MAP: { keywords: string[]; service: string }[] = [
  { keywords: ["web", "página", "pagina", "sitio", "landing", "tienda", "ecommerce", "shop"], service: "web" },
  { keywords: ["seo", "posicionamiento", "google", "maps", "busqueda", "búsqueda", "indexar", "local"], service: "seo" },
  { keywords: ["whatsapp", "bot", "mensaje", "wa", "whats", "automatizacion whatsapp", "waba"], service: "whatsapp" },
  { keywords: ["automatizacion", "automatización", "ia", "inteligencia", "ai", "chatgpt", "bot ia"], service: "automation" },
  { keywords: ["marketing", "redes", "publicidad", "instagram", "facebook", "linkedin", "tiktok", "ads", "anuncios"], service: "marketing" },
  { keywords: ["precio", "costó", "costo", "valor", "cuanto", "presupuesto", "planes", "planes"], service: "pricing" },
];

export function getAutoResponse(message: string): string {
  const lower = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Check for pricing
  if (KEYWORD_MAP[6].keywords.some((k) => lower.includes(k))) {
    return `💵 *Precios Mtsprz*

Cada proyecto es distinto, pero para darte una referencia:
• Desarrollo web: desde $150.000
• SEO: desde $50.000
• WhatsApp Business: desde $120.000/mes
• Automatización: desde $250.000
• Marketing Digital: desde $200.000/mes

Para darte un precio exacto, cuéntame un poco más de tu proyecto y te envío una propuesta personalizada ✨`;
  }

  // Match specific service
  for (const { keywords, service } of KEYWORD_MAP) {
    if (keywords.some((k) => lower.includes(k))) {
      if (service === "pricing") continue;
      return SERVICE_RESPONSES[service];
    }
  }

  // Default — welcome + menu
  return `👋 *¡Hola! Soy el asistente virtual de Mtsprz*

Somos una agencia digital 100% chilena, ubicada en Puerto Varas, especializada en ayudar a pymes de la Región de Los Lagos a crecer con tecnología.

Estos son nuestros servicios principales:

🌟 *Desarrollo Web* — Sitios, landing pages, tiendas online
🔍 *SEO* — Posicionamiento en Google + Maps locales
📱 *WhatsApp Business* — Bots, catálogo, automatización
🤖 *Automatización con IA* — Chatbots, procesos, integraciones
📢 *Marketing Digital* — Redes sociales, anuncios, contenido

¿En cuál de estos te puedo ayudar? Así te doy más información 😊`;
}

export function extractPhoneNumber(remoteJid: string): string {
  return remoteJid.replace(/@s\.whatsapp\.net$/, "");
}

export function notifyAdmin(leadName: string, phone: string, serviceInterest: string | null, message: string | null): Promise<SendMessageResult> {
  return sendText(
    ADMIN_NUMBER,
    `🔔 *Nuevo Lead Mtsprz*\n\n👤 ${leadName}\n📱 ${phone}\n🔧 ${serviceInterest || "No especificado"}\n💬 ${(message || "").slice(0, 200)}`
  );
}

export { ADMIN_NUMBER, INSTANCE, WABA_API_KEY, WABA_URL };
