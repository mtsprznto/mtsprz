import type { APIRoute } from "astro";
import { query, initDb } from "../../../../lib/db";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const { id } = params;

  if (!locals.user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }

  try {
    await initDb();
    const contract = await query("SELECT user_id FROM contracts WHERE id = $1", [Number(id)]);

    if (contract.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Contrato no encontrado" }), { status: 404 });
    }

    if (locals.user.role !== "super_admin" && contract.rows[0].user_id !== locals.user.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
    }

    const events = await query(
      "SELECT event_type, metadata, ip_address, created_at FROM signing_events WHERE contract_id = $1 ORDER BY created_at ASC",
      [Number(id)]
    );

    return new Response(JSON.stringify({ events: events.rows }), { status: 200 });
  } catch (err) {
    console.error("[Contracts] Events error:", err);
    return new Response(JSON.stringify({ error: "Error al obtener eventos" }), { status: 500 });
  }
};
