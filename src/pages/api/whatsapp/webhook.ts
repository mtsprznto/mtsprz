import type { APIRoute } from "astro";
import { initDb } from "../../../lib/db";
import { extractPhoneNumber, getAutoResponse, sendText, notifyAdmin, WAHA_API_KEY } from "../../../lib/whatsapp";
import { ackToStatus } from "../../../lib/waha";
import { wahaClient } from "../../../lib/waha";
import {
  createLead,
  findLeadByPhone,
  findConversationByWaMessageId,
  logConversation,
  updateConversationStatus,
  updateLead,
} from "../../../lib/leads";

export const prerender = false;

/** Extrae el texto de un mensaje entrante. WAHA v2026 usa `body`; `text`/`caption` son legacy. */
function extractText(payload: Record<string, unknown>): string {
  const body = payload.body;
  if (typeof body === "string" && body.length > 0) return body;
  const text = payload.text;
  if (typeof text === "string" && text.length > 0) return text;
  const caption = payload.caption;
  return typeof caption === "string" ? caption : "";
}

/**
 * Normaliza `from` de un mensaje entrante → número pelado.
 * WAHA v2026 manda LIDs (`261134615601379@lid`) en vez de `56912345678@c.us`;
 * los resolvemos vía API antes de extraer el número.
 */
async function resolveFrom(chatId: string): Promise<string> {
  if (chatId.endsWith("@lid")) {
    try {
      const resolved = await wahaClient.getLidToPhone(chatId);
      if (resolved?.pn) return extractPhoneNumber(resolved.pn);
    } catch (err) {
      console.error("[WhatsApp Webhook] LID resolution falló:", err);
    }
  }
  return extractPhoneNumber(chatId);
}

/** Handler de eventos `message` · mensajes entrantes/salientes. */
async function handleMessage(payload: Record<string, unknown>) {
  // Ignorar mensajes enviados por nosotros (echo de envíos propios)
  if (payload.fromMe === true) return;

  const chatId = typeof payload.from === "string" ? payload.from : "";
  if (!chatId) return;
  const phone = await resolveFrom(chatId);
  if (!phone) return;
  const waMessageId = typeof payload.id === "string" ? payload.id : `unknown_${Date.now()}`;
  const textContent = extractText(payload);

  await initDb();

  // Dedupe · WAHA reintenta webhooks; no duplicar conversaciones
  const existing = await findConversationByWaMessageId(waMessageId);
  if (existing) return;

  // Find existing lead or create new one
  let lead = await findLeadByPhone(phone);

  if (!lead) {
    const pushName = typeof payload.pushName === "string" ? payload.pushName : undefined;
    lead = await createLead({
      name: pushName || phone,
      phone,
      source: "whatsapp",
      message: textContent.slice(0, 500),
      metadata: { wa_push_name: pushName || null, first_contact: new Date().toISOString() },
    });

    // Send auto-response
    const autoReply = getAutoResponse(textContent);
    try {
      await sendText(phone, autoReply);
    } catch (err) {
      console.error("[WhatsApp Webhook] Auto-respuesta falló:", err);
    }

    // Log auto-response
    await logConversation({
      lead_id: lead.id,
      wa_message_id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      direction: "outgoing",
      message_type: "text",
      content: autoReply,
      status: "sent",
    });

    // Notify admin
    notifyAdmin(lead.name, phone, null, textContent).catch(() => {});
  } else {
    // Existing lead · update
    await updateLead(lead.id, {
      notes: lead.notes
        ? `${lead.notes}\n[${new Date().toISOString()}] ${textContent.slice(0, 200)}`
        : `[${new Date().toISOString()}] ${textContent.slice(0, 200)}`,
    });
  }

  // Log incoming message
  await logConversation({
    lead_id: lead.id,
    wa_message_id: waMessageId,
    direction: "incoming",
    message_type: "text",
    content: textContent || null,
    status: "received",
  });
}

/** Handler de eventos `message.ack` · actualiza estado de entrega. */
async function handleAck(payload: Record<string, unknown>) {
  const waMessageId = typeof payload.id === "string" ? payload.id : "";
  const ack = typeof payload.ack === "number" ? payload.ack : 0;
  if (!waMessageId) return;
  await initDb();
  await updateConversationStatus(waMessageId, ackToStatus(ack));
}

export const POST: APIRoute = async ({ request }) => {
  // Validate API key header · WAHA envía X-Api-Key via customHeaders;
  // se acepta `apikey` (legacy Evolution) para transición.
  const apiKey = request.headers.get("x-api-key") || request.headers.get("apikey");
  if (apiKey !== WAHA_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const payload = await request.json();
    const event = payload?.event;

    switch (event) {
      case "message":
        await handleMessage(payload?.payload || {});
        break;
      case "message.ack":
        await handleAck(payload?.payload || {});
        break;
      default:
        // Otros eventos (session.status, presence, etc.) se ignoran
        break;
    }

    return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
  } catch (err) {
    console.error("[WhatsApp Webhook] Error:", err);
    // Always return 200 to prevent WAHA from retrying
    return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
  }
};
