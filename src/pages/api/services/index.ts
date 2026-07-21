import type { APIRoute } from "astro";
import { query, initDb } from "../../../lib/db";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    await initDb();
    const activeOnly = url.searchParams.get("active") !== "false";
    let sql = "SELECT * FROM services";
    const params: (string | number | boolean | null)[] = [];
    if (activeOnly) {
      sql += " WHERE is_active = true";
    }
    sql += " ORDER BY category, name";
    const result = await query(sql, params);
    return new Response(JSON.stringify({ services: result.rows }), { status: 200 });
  } catch (err) {
    console.error("[Services] List error:", err);
    return new Response(JSON.stringify({ error: "Error al listar servicios" }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  const { slug, name, description, price, promo_price, category, deliverables, includes_maintenance, maintenance_price, maintenance_description } = body as any;

  if (!slug || !name || !price) {
    return new Response(JSON.stringify({ error: "slug, name y price requeridos" }), { status: 400 });
  }

  try {
    await initDb();
    const result = await query(
      `INSERT INTO services (slug, name, description, price, promo_price, category, deliverables, includes_maintenance, maintenance_price, maintenance_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        slug,
        name,
        description || null,
        price,
        promo_price || null,
        category || null,
        deliverables ? JSON.stringify(deliverables) : "[]",
        includes_maintenance || false,
        maintenance_price || 0,
        maintenance_description || null,
      ]
    );
    return new Response(JSON.stringify({ service: result.rows[0] }), { status: 201 });
  } catch (err) {
    console.error("[Services] Create error:", err);
    return new Response(JSON.stringify({ error: "Error al crear servicio" }), { status: 500 });
  }
};
