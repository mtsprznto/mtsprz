/**
 * WhatsApp — Capa de dominio (auto-responder + notificaciones).
 *
 * Consume el módulo de infraestructura `lib/waha` (transporte WAHA).
 * El dominio NO conoce detalles de transporte: solo números y textos.
 *
 * WAHA: https://waha.devlike.pro/docs/overview/introduction/
 */

import { wahaClient } from "./waha";
import type { WahaMessage, WahaSession } from "./waha";
import { extractPhoneNumber, toChatId } from "./waha";

const ADMIN_NUMBER = "56966929818";
const WAHA_URL = import.meta.env.WAHA_URL || "http://localhost:3000";
const WAHA_API_KEY = import.meta.env.WAHA_API_KEY || "";
const WAHA_SESSION = import.meta.env.WAHA_SESSION || "mtsprz";

/* ── Estado de conexión ── */

export interface ConnectionState {
  /** Estado de sesión WAHA: WORKING = lista. */
  state: string;
  reason?: string;
  /** reachoutTimelock activo (anti-bloqueo WhatsApp). */
  timelocked?: boolean;
}

/** Estado real de la sesión WAHA — pre-validación de envíos. */
export async function getConnectionState(): Promise<ConnectionState> {
  try {
    const session: WahaSession = await wahaClient.getSession();
    return {
      state: session.status,
      reason: session.status === "FAILED" ? "Sesión fallida — restart o logout + start" : undefined,
      timelocked: Boolean(session.me?.reachoutTimelock?.isActive),
    };
  } catch (err) {
    return { state: "unknown", reason: (err as Error).message };
  }
}

/* ── Envío ── */

export async function sendText(number: string, text: string): Promise<WahaMessage> {
  const state = await getConnectionState();
  if (state.state !== "WORKING") {
    throw new Error(
      `Sesión WhatsApp ${WAHA_SESSION} no está lista (${state.state}). ` +
        `Escanea el QR en http://localhost:3000/dashboard`
    );
  }
  if (state.timelocked) {
    // WhatsApp shadow-restringe outreach a contactos nuevos; el envío puede fallar con 463.
    console.warn("[WhatsApp] reachoutTimelock activo — envíos a contactos nuevos pueden fallar");
  }
  return wahaClient.sendText(toChatId(number), text);
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

  // Match specific service
  for (const { keywords, service } of KEYWORD_MAP) {
    if (keywords.some((k) => lower.includes(k))) {
      if (service === "pricing") {
        return `💵 *Precios Mtsprz*

Cada proyecto es distinto, pero para darte una referencia:
• Desarrollo web: desde $150.000
• SEO: desde $50.000
• WhatsApp Business: desde $120.000/mes
• Automatización: desde $250.000
• Marketing Digital: desde $200.000/mes

Para darte un precio exacto, cuéntame un poco más de tu proyecto y te envío una propuesta personalizada ✨`;
      }
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

export function notifyAdmin(
  leadName: string,
  phone: string,
  serviceInterest: string | null,
  message: string | null
): Promise<WahaMessage> {
  return sendText(
    ADMIN_NUMBER,
    `🔔 *Nuevo Lead Mtsprz*\n\n👤 ${leadName}\n📱 ${phone}\n🔧 ${serviceInterest || "No especificado"}\n💬 ${(message || "").slice(0, 200)}`
  );
}

export { ADMIN_NUMBER, WAHA_URL, WAHA_API_KEY, WAHA_SESSION, extractPhoneNumber };
