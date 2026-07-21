import type { APIRoute } from "astro";
import { query, initDb } from "../../../../lib/db";
import { dataUrlToBase64 } from "../../../../lib/storage";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { id } = params;

  if (!locals.user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }

  let body: {
    signature_data?: string;
    id_front_data?: string;
    id_back_data?: string;
    selfie_data?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  if (!body.signature_data) {
    return new Response(JSON.stringify({ error: "Firma requerida" }), { status: 400 });
  }

  try {
    await initDb();

    const contractResult = await query("SELECT * FROM contracts WHERE id = $1", [Number(id)]);
    if (contractResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Contrato no encontrado" }), { status: 404 });
    }

    const contract = contractResult.rows[0] as Record<string, unknown>;

    if (locals.user.role !== "super_admin" && contract.user_id !== locals.user.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
    }

    if (contract.status === "completed") {
      return new Response(JSON.stringify({ error: "Contrato ya está completamente firmado" }), { status: 400 });
    }

    if (locals.user.role === "super_admin") {
      const now = new Date().toISOString();
      const sigBase64 = dataUrlToBase64(body.signature_data);

      await query(
        "UPDATE contracts SET admin_signature_data = $1, admin_signed_at = NOW(), status = CASE WHEN client_signature_data IS NOT NULL THEN 'completed' ELSE status END, updated_at = NOW() WHERE id = $2",
        [sigBase64, Number(id)]
      );

      await query(
        "INSERT INTO signing_events (contract_id, event_type, metadata, ip_address, user_agent) VALUES ($1, 'signed_admin', $2, $3, $4)",
        [Number(id), JSON.stringify({ user_id: locals.user.id }), request.headers.get("x-forwarded-for") || "", request.headers.get("user-agent") || ""]
      );
    } else {
      const sigBase64 = dataUrlToBase64(body.signature_data);

      await query(
        "UPDATE contracts SET client_signature_data = $1, client_signed_at = NOW(), status = CASE WHEN admin_signature_data IS NOT NULL THEN 'completed' ELSE 'client_signed' END, updated_at = NOW() WHERE id = $2",
        [sigBase64, Number(id)]
      );

      await query(
        "INSERT INTO signing_events (contract_id, event_type, metadata, ip_address, user_agent) VALUES ($1, 'signed_client', $2, $3, $4)",
        [Number(id), JSON.stringify({ user_id: locals.user.id }), request.headers.get("x-forwarded-for") || "", request.headers.get("user-agent") || ""]
      );

      if (body.id_front_data || body.id_back_data || body.selfie_data) {
        await query(
          "INSERT INTO id_verifications (contract_id, id_front_data, id_back_data, selfie_data, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            Number(id),
            body.id_front_data ? dataUrlToBase64(body.id_front_data) : null,
            body.id_back_data ? dataUrlToBase64(body.id_back_data) : null,
            body.selfie_data ? dataUrlToBase64(body.selfie_data) : null,
            request.headers.get("x-forwarded-for") || "",
            request.headers.get("user-agent") || "",
          ]
        );
      }
    }

    const updated = await query("SELECT * FROM contracts WHERE id = $1", [Number(id)]);
    return new Response(JSON.stringify({ success: true, contract: updated.rows[0] }), { status: 200 });
  } catch (err) {
    console.error("[Contracts] Sign error:", err);
    return new Response(JSON.stringify({ error: "Error al firmar contrato" }), { status: 500 });
  }
};
