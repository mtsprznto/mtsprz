import type { APIRoute } from "astro";
import { query, initDb } from "../../../lib/db";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
};

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const { id } = params;

  if (!locals.user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401, headers: JSON_HEADERS });
  }

  try {
    await initDb();
    const result = await query("SELECT * FROM contracts WHERE id = $1", [Number(id)]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Contrato no encontrado" }), { status: 404, headers: JSON_HEADERS });
    }

    const contract = result.rows[0] as Record<string, unknown>;

    if (locals.user.role !== "super_admin" && contract.user_id !== locals.user.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers: JSON_HEADERS });
    }

    return new Response(JSON.stringify({ contract }), { status: 200, headers: JSON_HEADERS });
  } catch (err) {
    console.error("[Contracts] Get error:", err);
    return new Response(JSON.stringify({ error: "Error al obtener contrato" }), { status: 500, headers: JSON_HEADERS });
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers: JSON_HEADERS });
  }

  const { id } = params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400, headers: JSON_HEADERS });
  }

  try {
    await initDb();
    const allowedFields = [
      "status", "client_name", "client_rut", "client_email", "client_phone",
      "client_address", "company_name", "services", "total_amount",
      "payment_terms", "start_date", "end_date", "duration_months",
      "schedule", "special_clauses",
    ];

    const updates: string[] = [];
    const params_: (string | number | boolean | null)[] = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const val = field === "services" ? JSON.stringify(body[field]) : body[field];
        updates.push(`${field} = $${idx}`);
        params_.push(val as string | number | boolean | null);
        idx++;
      }
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: "Sin campos para actualizar" }), { status: 400, headers: JSON_HEADERS });
    }

    updates.push(`updated_at = NOW()`);
    params_.push(Number(id));

    const sql = `UPDATE contracts SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`;
    const result = await query(sql, params_);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Contrato no encontrado" }), { status: 404, headers: JSON_HEADERS });
    }

    await query(
      "INSERT INTO signing_events (contract_id, event_type, metadata) VALUES ($1, 'updated', $2)",
      [Number(id), JSON.stringify({ updated_by: locals.user.id, changes: body })]
    );

    return new Response(JSON.stringify({ contract: result.rows[0] }), { status: 200, headers: JSON_HEADERS });
  } catch (err) {
    console.error("[Contracts] Update error:", err);
    return new Response(JSON.stringify({ error: "Error al actualizar contrato" }), { status: 500, headers: JSON_HEADERS });
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers: JSON_HEADERS });
  }

  const { id } = params;
  try {
    await initDb();
    const existing = await query("SELECT id FROM contracts WHERE id = $1", [Number(id)]);
    if (existing.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Contrato no encontrado" }), { status: 404, headers: JSON_HEADERS });
    }

    await query("DELETE FROM signing_events WHERE contract_id = $1", [Number(id)]);
    await query("DELETE FROM id_verifications WHERE contract_id = $1", [Number(id)]);
    await query("DELETE FROM contracts WHERE id = $1", [Number(id)]);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: JSON_HEADERS });
  } catch (err) {
    console.error("[Contracts] Delete error:", err);
    return new Response(JSON.stringify({ error: "Error al eliminar contrato" }), { status: 500, headers: JSON_HEADERS });
  }
};
