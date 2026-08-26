/**
 * POST /api/webhooks/resend — Webhook de Resend para tracking de emails.
 *
 * Eventos soportados: delivered, opened, clicked, bounced, complained.
 * Verifica firma HMAC del webhook (RESEND_WEBHOOK_SECRET).
 * Guarda cada evento en email_events para el dashboard admin.
 */

import type { APIRoute } from "astro";
import { initDb, query } from "../../../lib/db";

export const prerender = false;

const RESEND_WEBHOOK_SECRET = import.meta.env.RESEND_WEBHOOK_SECRET ?? "";

/** Verifica la firma HMAC-SHA256 del webhook de Resend. */
async function verifySignature(body: string, signature: string): Promise<boolean> {
  if (!RESEND_WEBHOOK_SECRET) return true; // sin secret → skip (dev)
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(RESEND_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return expected === signature.replace("sha256=", "");
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const signature = request.headers.get("resend-signature") ?? "";

  if (RESEND_WEBHOOK_SECRET && !(await verifySignature(rawBody, signature))) {
    console.warn("[Resend Webhook] Firma inválida");
    return new Response("Unauthorized", { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const eventType = typeof body.type === "string" ? body.type : "unknown";
  const data = (body.data ?? {}) as Record<string, unknown>;
  const email = typeof data.email === "string" ? data.email : "";
  const messageId = typeof data.message_id === "string" ? data.message_id : "";

  // Solo eventos de email relevantes
  const validTypes = ["delivered", "opened", "clicked", "bounced", "complained"];
  if (!validTypes.includes(eventType)) {
    return new Response("OK", { status: 200 });
  }

  try {
    await initDb();
    await query(
      `INSERT INTO email_events (event_type, email, message_id, metadata)
       VALUES ($1, $2, $3, $4)`,
      [eventType, email, messageId, JSON.stringify(data)]
    );
    console.log(`[Resend Webhook] ${eventType} → ${email}`);
  } catch (err) {
    console.error("[Resend Webhook] DB error:", err);
    // 200 para evitar retries de Resend
  }

  return new Response("OK", { status: 200 });
};
