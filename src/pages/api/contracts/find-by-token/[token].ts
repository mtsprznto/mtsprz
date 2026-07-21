import type { APIRoute } from "astro";
import { query, initDb } from "../../../../lib/db";

export const prerender = false;

const JSON_HEADERS = { "Content-Type": "application/json" };

export const GET: APIRoute = async ({ params }) => {
  const { token } = params;
  if (!token) {
    return new Response(JSON.stringify({ error: "Token requerido" }), { status: 400, headers: JSON_HEADERS });
  }

  try {
    await initDb();
    const result = await query("SELECT * FROM contracts WHERE signing_token = $1", [token]);
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Enlace inv\u00e1lido o expirado" }), { status: 404, headers: JSON_HEADERS });
    }

    const contract = result.rows[0] as Record<string, unknown>;

    const expiresAt = contract.token_expires_at as string;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return new Response(JSON.stringify({ error: "Este enlace ha expirado (v\u00e1lido por 7 d\u00edas)" }), { status: 410, headers: JSON_HEADERS });
    }

    if (contract.status === "completed" || contract.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Este contrato ya fue procesado" }), { status: 400, headers: JSON_HEADERS });
    }

    const services = typeof contract.services === "string" ? JSON.parse(contract.services as string) : contract.services;

    return new Response(JSON.stringify({
      contract: {
        id: contract.id,
        contract_number: contract.contract_number,
        status: contract.status,
        client_name: contract.client_name,
        client_rut: contract.client_rut,
        client_email: contract.client_email,
        client_phone: contract.client_phone,
        client_address: contract.client_address,
        services: services,
        total_amount: contract.total_amount,
        duration_months: contract.duration_months,
        payment_terms: contract.payment_terms,
        start_date: contract.start_date,
        end_date: contract.end_date,
        schedule: contract.schedule,
        special_clauses: contract.special_clauses,
        admin_signed_at: contract.admin_signed_at,
        created_at: contract.created_at,
      }
    }), { status: 200, headers: JSON_HEADERS });
  } catch (err) {
    console.error("[Contracts] Find by token error:", err);
    return new Response(JSON.stringify({ error: "Error al buscar contrato" }), { status: 500, headers: JSON_HEADERS });
  }
};
