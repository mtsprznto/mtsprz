import type { APIRoute } from "astro";
import { getLeadById, updateLead, getConversations } from "../../../lib/leads";
import { normalizePhone } from "../../../lib/phone";

export const prerender = false;

export const GET: APIRoute = async ({ locals, params }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  const id = Number(params.id);
  if (!id) {
    return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 });
  }

  try {
    const lead = await getLeadById(id);
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead no encontrado" }), { status: 404 });
    }

    const conversations = await getConversations(id);

    return new Response(JSON.stringify({ lead, conversations }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Leads] Get error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ request, locals, params }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  const id = Number(params.id);
  if (!id) {
    return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  const validStatuses = ["new", "contacted", "qualified", "lost"];
  const updateData: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!validStatuses.includes(String(body.status))) {
      return new Response(JSON.stringify({ error: "Estado inválido" }), { status: 400 });
    }
    updateData.status = String(body.status);
  }
  if (body.notes !== undefined) {
    updateData.notes = String(body.notes).trim();
  }
  if (body.service_interest !== undefined) {
    updateData.service_interest = String(body.service_interest).trim();
  }
  if (body.name !== undefined) {
    updateData.name = String(body.name).trim();
  }
  if (body.phone !== undefined) {
    updateData.phone = normalizePhone(String(body.phone).trim());
  }
  if (body.email !== undefined) {
    updateData.email = String(body.email).trim().toLowerCase();
  }

  try {
    const lead = await updateLead(id, updateData as Parameters<typeof updateLead>[1]);
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead no encontrado" }), { status: 404 });
    }

    return new Response(JSON.stringify({ lead }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Leads] Update error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
};
