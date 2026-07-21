import type { APIRoute } from "astro";
import { query, initDb } from "../../../../lib/db";

export const prerender = false;

const JSON_HEADERS = { "Content-Type": "application/json" };

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  try {
    await initDb();
    const result = await query(
      "SELECT contract_number, status, pdf_hash, client_name, client_rut, admin_signed_at, client_signed_at, created_at FROM contracts WHERE id = $1",
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Contrato no encontrado" }), { status: 404, headers: JSON_HEADERS });
    }

    return new Response(JSON.stringify({ verification: result.rows[0] }), { status: 200, headers: JSON_HEADERS });
  } catch (err) {
    console.error("[Contracts] Verify error:", err);
    return new Response(JSON.stringify({ error: "Error al verificar" }), { status: 500, headers: JSON_HEADERS });
  }
};
