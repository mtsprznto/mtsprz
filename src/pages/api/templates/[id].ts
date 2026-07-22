import type { APIRoute } from "astro";
import { query, initDb } from "../../../lib/db";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  const id = params.id;
  if (!id || !/^\d+$/.test(id)) {
    return new Response(JSON.stringify({ error: "ID inválido" }), { status: 400 });
  }

  try {
    await initDb();
    const numericId = parseInt(id);

    // Template itself
    const tpl = await query("SELECT * FROM contract_templates WHERE id = $1", [numericId]);
    if (tpl.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Plantilla no encontrada" }), { status: 404 });
    }

    // Contracts using this template
    const contracts = await query(
      `SELECT id, contract_number, client_name, status, total_amount, created_at
       FROM contracts WHERE template_id = $1 ORDER BY created_at DESC`,
      [numericId]
    );

    return new Response(JSON.stringify({
      template: tpl.rows[0],
      contractCount: contracts.rows.length,
      contracts: contracts.rows,
    }), { status: 200 });
  } catch (err) {
    console.error("[Templates] Get error:", err);
    return new Response(JSON.stringify({ error: "Error al obtener plantilla" }), { status: 500 });
  }
};
