import type { APIRoute } from "astro";
import { initDb } from "../../../lib/db";
import { extractPhoneNumber, getAutoResponse, sendText, notifyAdmin, WABA_API_KEY } from "../../../lib/whatsapp";
import { createLead, findLeadByPhone, logConversation, updateLead } from "../../../lib/leads";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Validate API key header
  const apiKey = request.headers.get("apikey");
  if (apiKey !== WABA_API_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const payload = await request.json();

    // Only process MESSAGES_UPSERT
    if (payload.event !== "MESSAGES_UPSERT") {
      return new Response(JSON.stringify({ status: "ignored" }), { status: 200 });
    }

    const data = payload.data;
    if (!data?.key) {
      return new Response(JSON.stringify({ status: "ignored" }), { status: 200 });
    }

    // Ignore outgoing messages (fromMe = true)
    if (data.key.fromMe) {
      return new Response(JSON.stringify({ status: "ignored" }), { status: 200 });
    }

    await initDb();

    const phone = extractPhoneNumber(data.key.remoteJid);
    const waMessageId = data.key.id;

    // Extract text content
    let textContent = "";
    if (data.message?.conversation) {
      textContent = data.message.conversation;
    } else if (data.message?.extendedTextMessage?.text) {
      textContent = data.message.extendedTextMessage.text;
    } else if (data.message?.imageMessage?.caption) {
      textContent = data.message.imageMessage.caption;
    } else if (data.message?.documentMessage?.caption) {
      textContent = data.message.documentMessage.caption;
    }

    // Find existing lead or create new one
    let lead = await findLeadByPhone(phone);

    if (!lead) {
      // New lead — create with phone as name placeholder
      lead = await createLead({
        name: data.pushName || phone,
        phone,
        source: "whatsapp",
        message: textContent.slice(0, 500),
        metadata: { wa_push_name: data.pushName || null, first_contact: new Date().toISOString() },
      });

      // Send auto-response
      const autoReply = getAutoResponse(textContent);
      await sendText(phone, autoReply);

      // Log auto-response
      await logConversation({
        lead_id: lead.id,
        wa_message_id: `auto_${Date.now()}`,
        direction: "outgoing",
        message_type: "text",
        content: autoReply,
        status: "sent",
      });

      // Notify admin
      notifyAdmin(lead.name, phone, null, textContent).catch(() => {});
    } else {
      // Existing lead — update
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

    return new Response(JSON.stringify({ status: "ok", lead_id: lead.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[WhatsApp Webhook] Error:", err);
    // Always return 200 to prevent Evolution API from retrying
    return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
  }
};
