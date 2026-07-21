import type { APIRoute } from "astro";
import { query, initDb } from "../../../../lib/db";
import { dataUrlToBase64 } from "../../../../lib/storage";
import { sendEmail, contractSignedEmail, adminContractCompletedEmail } from "../../../../lib/mail";

export const prerender = false;

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const { id } = params;

  if (!locals.user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401, headers: JSON_HEADERS });
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
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400, headers: JSON_HEADERS });
  }

  if (!body.signature_data) {
    return new Response(JSON.stringify({ error: "Firma requerida" }), { status: 400, headers: JSON_HEADERS });
  }

  try {
    await initDb();

    const contractResult = await query("SELECT * FROM contracts WHERE id = $1", [Number(id)]);
    if (contractResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Contrato no encontrado" }), { status: 404, headers: JSON_HEADERS });
    }

    const contract = contractResult.rows[0] as Record<string, unknown>;

    if (locals.user.role !== "super_admin" && contract.user_id !== locals.user.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers: JSON_HEADERS });
    }

    if (contract.status === "completed") {
      return new Response(JSON.stringify({ error: "Contrato ya está completamente firmado" }), { status: 400, headers: JSON_HEADERS });
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
    const signedContract = updated.rows?.[0] as Record<string, unknown> | undefined;

    // Send completion emails when admin sign triggers completed status
    if (signedContract?.status === "completed" && locals.user.role === "super_admin") {
      const pdfLink =
        (import.meta.env.SITE || "https://mtsprz.org") +
        "/api/contracts/" +
        id +
        "/pdf";
      const clientEmail = signedContract.client_email as string;
      const clientName = signedContract.client_name as string;
      const contractNumber = signedContract.contract_number as string;
      const adminEmail =
        (import.meta.env.RESEND_TO as string) || "contacto@mtsprz.org";
      const adminLink =
        (import.meta.env.SITE || "https://mtsprz.org") +
        "/admin/contratos/" +
        id;

      try {
        if (clientEmail) {
          await sendEmail({
            to: clientEmail,
            subject: `Contrato ${contractNumber} firmado — Mtsprz`,
            html: contractSignedEmail(clientName, contractNumber, pdfLink),
          });
        }

        await sendEmail({
          to: adminEmail,
          subject: `Contrato ${contractNumber} completado — Mtsprz`,
          html: adminContractCompletedEmail(
            clientName,
            contractNumber,
            adminLink,
            pdfLink,
            clientEmail
          ),
        });
      } catch (emailErr) {
        console.error("[Sign] Completion email error:", emailErr);
      }
    }

    return new Response(JSON.stringify({ success: true, contract: signedContract }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error("[Contracts] Sign error:", err);
    return new Response(JSON.stringify({ error: "Error al firmar contrato" }), { status: 500, headers: JSON_HEADERS });
  }
};
