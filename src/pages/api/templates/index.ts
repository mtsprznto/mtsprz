import type { APIRoute } from "astro";
import { query, initDb } from "../../../lib/db";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  try {
    await initDb();
    const result = await query(
      `SELECT ct.*, COUNT(c.id)::int AS contract_count
       FROM contract_templates ct
       LEFT JOIN contracts c ON c.template_id = ct.id
       WHERE ct.is_active = true
       GROUP BY ct.id
       ORDER BY ct.name ASC`
    );
    return new Response(JSON.stringify({ templates: result.rows }), { status: 200 });
  } catch (err) {
    console.error("[Templates] List error:", err);
    return new Response(JSON.stringify({ error: "Error al listar plantillas" }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  let body: { name?: string; type?: string; description?: string; content_json?: any };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  if (!body.name || !body.type || !body.content_json) {
    return new Response(JSON.stringify({ error: "Nombre, tipo y contenido requeridos" }), { status: 400 });
  }

  try {
    await initDb();
    const result = await query(
      "INSERT INTO contract_templates (name, type, description, content_json) VALUES ($1, $2, $3, $4) RETURNING *",
      [body.name, body.type, body.description || null, JSON.stringify(body.content_json)]
    );

    return new Response(JSON.stringify({ template: result.rows[0] }), { status: 201 });
  } catch (err) {
    console.error("[Templates] Create error:", err);
    return new Response(JSON.stringify({ error: "Error al crear plantilla" }), { status: 500 });
  }
};
