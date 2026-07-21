import type { APIRoute } from "astro";
import { query, initDb } from "../../../lib/db";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;
  try {
    await initDb();
    const result = await query("SELECT * FROM services WHERE slug = $1", [slug]);
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Servicio no encontrado" }), { status: 404 });
    }
    return new Response(JSON.stringify({ service: result.rows[0] }), { status: 200 });
  } catch (err) {
    console.error("[Services] Get error:", err);
    return new Response(JSON.stringify({ error: "Error al obtener servicio" }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request, params, locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  const { slug } = params;
  const { name, description, price, promo_price, category, deliverables, includes_maintenance, maintenance_price, maintenance_description, is_active } = body as any;

  try {
    await initDb();
    const result = await query(
      `UPDATE services SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        promo_price = $4,
        category = COALESCE($5, category),
        deliverables = COALESCE($6, deliverables),
        includes_maintenance = COALESCE($7, includes_maintenance),
        maintenance_price = COALESCE($8, maintenance_price),
        maintenance_description = COALESCE($9, maintenance_description),
        is_active = COALESCE($10, is_active),
        updated_at = NOW()
       WHERE slug = $11 RETURNING *`,
      [
        name || null,
        description || null,
        price || null,
        promo_price ?? null,
        category || null,
        deliverables ? JSON.stringify(deliverables) : null,
        includes_maintenance ?? null,
        maintenance_price ?? null,
        maintenance_description || null,
        is_active ?? null,
        slug,
      ]
    );
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Servicio no encontrado" }), { status: 404 });
    }
    return new Response(JSON.stringify({ service: result.rows[0] }), { status: 200 });
  } catch (err) {
    console.error("[Services] Update error:", err);
    return new Response(JSON.stringify({ error: "Error al actualizar servicio" }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  const { slug } = params;
  try {
    const result = await query("DELETE FROM services WHERE slug = $1 RETURNING id", [slug]);
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Servicio no encontrado" }), { status: 404 });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("[Services] Delete error:", err);
    return new Response(JSON.stringify({ error: "Error al eliminar servicio" }), { status: 500 });
  }
};
