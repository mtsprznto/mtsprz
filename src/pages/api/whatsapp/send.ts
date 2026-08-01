import type { APIRoute } from "astro";
import { sendText, getConnectionState, ADMIN_NUMBER, WAHA_URL, WAHA_SESSION } from "../../../lib/whatsapp";
import { logConversation, findLeadByPhone } from "../../../lib/leads";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // Require super_admin for manual send
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  let body: { number?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  if (!body.number || !body.text) {
    return new Response(JSON.stringify({ error: "number y text requeridos" }), { status: 400 });
  }

  // Normalize number: remove + if present
  const number = body.number.replace(/^\+/, "");
  const text = body.text;

  try {
    const result = await sendText(number, text);

    // Log to conversations if lead exists
    const lead = await findLeadByPhone(number);
    if (lead) {
      await logConversation({
        lead_id: lead.id,
        wa_message_id: result.id || `manual_${Date.now()}`,
        direction: "outgoing",
        message_type: "text",
        content: text,
        status: "sent",
      });
    }

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[WhatsApp Send] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error al enviar mensaje" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/** Health check — estado real de la sesión WAHA */
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  const state = await getConnectionState();
  return new Response(
    JSON.stringify({
      status: state.state === "WORKING" ? "connected" : state.state,
      session: WAHA_SESSION,
      admin_number: ADMIN_NUMBER,
      waha: {
        base_url: WAHA_URL,
        session_status: state.state,
        reachout_timelock: state.timelocked,
        connection_reason: state.reason || null,
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
