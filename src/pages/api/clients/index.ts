import type { APIRoute } from "astro";
import { query, initDb } from "../../../lib/db";

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  const search = url.searchParams.get("search") || "";

  try {
    await initDb();

    let rows: Record<string, unknown>[];
    if (search.trim()) {
      // ILIKE fallback — más robusto que tsvector para búsquedas cortas/parciales
      const pattern = `%${search.trim()}%`;
      const result = await query(
        `SELECT id, name, company_name, rut, email, phone, address, nationality, profession, notes, notif_email, representante, created_at
         FROM clients
         WHERE is_active = true
           AND (name ILIKE $1 OR company_name ILIKE $1 OR rut ILIKE $1 OR email ILIKE $1)
         ORDER BY name ASC
         LIMIT 10`,
        [pattern]
      );
      rows = result.rows;
    } else {
      const result = await query(
        `SELECT id, name, company_name, rut, email, phone, address, nationality, profession, notes, notif_email, representante, created_at
         FROM clients WHERE is_active = true ORDER BY name ASC LIMIT 20`
      );
      rows = result.rows;
    }

    return new Response(JSON.stringify({ clients: rows }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("[Clients] List error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
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

  if (!body.name) {
    return new Response(JSON.stringify({ error: "Nombre requerido" }), { status: 400 });
  }

  try {
    await initDb();
    const name = String(body.name);
    const companyName = body.company_name ? String(body.company_name) : null;
    const rut = body.rut ? String(body.rut) : null;
    const email = body.email ? String(body.email) : null;
    const phone = body.phone ? String(body.phone) : null;
    const address = body.address ? String(body.address) : null;
    const nationality = body.nationality ? String(body.nationality) : "Chilena";
    const profession = body.profession ? String(body.profession) : null;
    const notes = body.notes ? String(body.notes) : null;

    const notifEmail = body.notif_email ? String(body.notif_email) : null;
    const representante = body.representante ? String(body.representante) : null;

    const result = await query(
      `INSERT INTO clients (name, company_name, rut, email, phone, address, nationality, profession, notes, notif_email, representante)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (LOWER(TRIM(email))) WHERE email IS NOT NULL AND is_active = true
       DO UPDATE SET
         name         = EXCLUDED.name,
         company_name = EXCLUDED.company_name,
         rut          = EXCLUDED.rut,
         phone        = EXCLUDED.phone,
         address      = EXCLUDED.address,
         nationality  = EXCLUDED.nationality,
         profession   = EXCLUDED.profession,
         notes        = COALESCE(EXCLUDED.notes, clients.notes),
         notif_email  = COALESCE(EXCLUDED.notif_email, clients.notif_email),
         representante= COALESCE(EXCLUDED.representante, clients.representante),
         updated_at   = NOW()
       RETURNING id, name, company_name, rut, email, phone, address, nationality, profession, notes, notif_email, representante, created_at`,
      [name, companyName, rut, email, phone, address, nationality, profession, notes, notifEmail, representante]
    );

    return new Response(JSON.stringify({ client: result.rows[0] }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Clients] Create error:", err);
    return new Response(JSON.stringify({ error: "Error al crear cliente" }), { status: 500 });
  }
};
