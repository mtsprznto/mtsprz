import type { APIRoute } from "astro";
import { query, initDb } from "../../../lib/db";

export const prerender = false;

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
};

const ALLOWED_FIELDS = [
  "name", "company_name", "rut", "email", "phone",
  "address", "nationality", "profession", "notes",
  "notif_email", "representante",
];

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers: JSON_HEADERS });
  }

  const { id } = params;
  if (!id || !/^\d+$/.test(id)) {
    return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400, headers: JSON_HEADERS });
  }

  try {
    await initDb();
    const result = await query(
      `SELECT id, name, company_name, rut, email, phone, address, nationality, profession, notes, notif_email, representante, created_at, updated_at
       FROM clients WHERE id = $1 AND is_active = true`,
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Cliente no encontrado" }), { status: 404, headers: JSON_HEADERS });
    }

    return new Response(JSON.stringify({ client: result.rows[0] }), { status: 200, headers: JSON_HEADERS });
  } catch (err) {
    console.error("[Clients] Get error:", err);
    return new Response(JSON.stringify({ error: "Error al obtener cliente" }), { status: 500, headers: JSON_HEADERS });
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers: JSON_HEADERS });
  }

  const { id } = params;
  if (!id || !/^\d+$/.test(id)) {
    return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400, headers: JSON_HEADERS });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400, headers: JSON_HEADERS });
  }

  try {
    await initDb();

    // Build dynamic UPDATE
    const updates: string[] = [];
    const params_: (string | number | boolean | null)[] = [];
    let idx = 1;

    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${idx}`);
        params_.push(body[field] as string | number | boolean | null);
        idx++;
      }
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: "Sin campos para actualizar" }), { status: 400, headers: JSON_HEADERS });
    }

    updates.push(`updated_at = NOW()`);
    params_.push(Number(id));

    const sql = `UPDATE clients SET ${updates.join(", ")} WHERE id = $${idx} AND is_active = true RETURNING id, name, company_name, rut, email, phone, address, nationality, profession, notes, notif_email, representante, created_at, updated_at`;
    const result = await query(sql, params_);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Cliente no encontrado" }), { status: 404, headers: JSON_HEADERS });
    }

    return new Response(JSON.stringify({ client: result.rows[0] }), { status: 200, headers: JSON_HEADERS });
  } catch (err) {
    console.error("[Clients] Update error:", err);
    return new Response(JSON.stringify({ error: "Error al actualizar cliente" }), { status: 500, headers: JSON_HEADERS });
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers: JSON_HEADERS });
  }

  const { id } = params;
  if (!id || !/^\d+$/.test(id)) {
    return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400, headers: JSON_HEADERS });
  }

  try {
    await initDb();

    // Verify exists
    const existing = await query("SELECT id FROM clients WHERE id = $1 AND is_active = true", [Number(id)]);
    if (existing.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Cliente no encontrado" }), { status: 404, headers: JSON_HEADERS });
    }

    // Soft delete
    await query("UPDATE clients SET is_active = false, updated_at = NOW() WHERE id = $1", [Number(id)]);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: JSON_HEADERS });
  } catch (err) {
    console.error("[Clients] Delete error:", err);
    return new Response(JSON.stringify({ error: "Error al eliminar cliente" }), { status: 500, headers: JSON_HEADERS });
  }
};
