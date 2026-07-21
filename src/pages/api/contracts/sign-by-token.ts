import type { APIRoute } from "astro";
import { query, initDb } from "../../../lib/db";
import { dataUrlToBase64 } from "../../../lib/storage";
import { sendEmail, contractSignedEmail } from "../../../lib/mail";
import { decodeVerificationToken } from "../../../lib/biometric";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inv\u00e1lido" }), { status: 400 });
  }

  const { signing_token, signature_data, client_name, client_rut, client_phone, client_address, id_front_data, id_back_data, selfie_data, verification_token } = body as any;

  // Verificaci\u00f3n biom\u00e9trica: el token debe existir y ser v\u00e1lido (firmado por el servidor)
  if (!verification_token) {
    return new Response(
      JSON.stringify({ error: "Verificaci\u00f3n biom\u00e9trica requerida. Completa la verificaci\u00f3n antes de firmar." }),
      { status: 400 }
    );
  }
  const bioClaims = decodeVerificationToken(verification_token as string);
  if (!bioClaims) {
    return new Response(
      JSON.stringify({ error: "Token de verificaci\u00f3n inv\u00e1lido o expirado. Repite la verificaci\u00f3n biom\u00e9trica." }),
      { status: 400 }
    );
  }
  if (bioClaims.signing_token !== signing_token) {
    return new Response(
      JSON.stringify({ error: "Token de verificaci\u00f3n no corresponde a este contrato." }),
      { status: 400 }
    );
  }

  // Extraer resultados validados del token (no del cliente)
  const face_match_score = bioClaims.face_match_score;
  const liveness_passed = bioClaims.liveness_passed;
  const rut_valid = bioClaims.rut_valid;
  const mrz_valid = bioClaims.mrz_valid;
  const verification_status =
    bioClaims.rut_valid && bioClaims.has_id_front && bioClaims.liveness_passed
      ? "passed"
      : "pending";

  if (!signing_token) {
    return new Response(JSON.stringify({ error: "Token requerido" }), { status: 400 });
  }

  if (!signature_data) {
    return new Response(JSON.stringify({ error: "Firma requerida" }), { status: 400 });
  }

  try {
    await initDb();
    const result = await query("SELECT * FROM contracts WHERE signing_token = $1", [signing_token]);
    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Enlace inv\u00e1lido" }), { status: 404 });
    }

    const contract = result.rows[0] as Record<string, unknown>;
    const contractId = contract.id as number;

    const expiresAt = contract.token_expires_at as string;
    if (expiresAt && new Date(expiresAt) < new Date()) {
      return new Response(JSON.stringify({ error: "Este enlace ha expirado (v\u00e1lido por 7 d\u00edas)" }), { status: 410 });
    }

    if (contract.status === "completed") {
      return new Response(JSON.stringify({ error: "Contrato ya est\u00e1 completamente firmado" }), { status: 400 });
    }

    if (contract.client_signature_data) {
      return new Response(JSON.stringify({ error: "Ya has firmado este contrato" }), { status: 400 });
    }

    const sigBase64 = dataUrlToBase64(signature_data);

    const updateFields: string[] = ["client_signature_data = $1", "client_signed_at = NOW()", "updated_at = NOW()"];
    const updateParams: (string | number | boolean | null)[] = [sigBase64];
    let paramIdx = 2;

    if (client_name) {
      updateFields.push(`client_name = $${paramIdx}`);
      updateParams.push(client_name as string);
      paramIdx++;
    }
    if (client_rut) {
      updateFields.push(`client_rut = $${paramIdx}`);
      updateParams.push(client_rut as string);
      paramIdx++;
    }
    if (client_phone) {
      updateFields.push(`client_phone = $${paramIdx}`);
      updateParams.push(client_phone as string);
      paramIdx++;
    }
    if (client_address) {
      updateFields.push(`client_address = $${paramIdx}`);
      updateParams.push(client_address as string);
      paramIdx++;
    }

    const newStatus = contract.admin_signature_data ? "'completed'" : "'client_signed'";
    updateFields.push(`status = ${newStatus}`);
    updateParams.push(contractId);

    const sql = `UPDATE contracts SET ${updateFields.join(", ")} WHERE id = $${paramIdx}`;
    await query(sql, updateParams);

    await query(
      "INSERT INTO signing_events (contract_id, event_type, metadata, ip_address, user_agent) VALUES ($1, 'signed_client', $2, $3, $4)",
      [contractId, JSON.stringify({ signed_via_token: true }), request.headers.get("x-forwarded-for") || "", request.headers.get("user-agent") || ""]
    );

    // Guardar verificación — scores vienen del bioClaims (firmado por servidor)
    await query(
      `INSERT INTO id_verifications
        (contract_id, id_front_data, id_back_data, selfie_data,
         face_match_score, liveness_passed, rut_valid, mrz_valid, verification_status,
         ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        contractId,
        bioClaims.has_id_front && id_front_data ? dataUrlToBase64(id_front_data) : null,
        bioClaims.has_id_back && id_back_data ? dataUrlToBase64(id_back_data) : null,
        bioClaims.has_selfie && selfie_data ? dataUrlToBase64(selfie_data) : null,
        face_match_score != null ? Number(face_match_score) : null,
        liveness_passed,
        rut_valid,
        mrz_valid,
        verification_status,
        request.headers.get("x-forwarded-for") || "",
        request.headers.get("user-agent") || "",
      ]
    );

    const updated = await query("SELECT * FROM contracts WHERE id = $1", [contractId]);
    const updatedContract = updated.rows[0] as Record<string, unknown>;

    try {
      var pdfLink = (import.meta.env.SITE || "https://mtsprz.org") + "/api/contracts/" + contractId + "/pdf";
      var clientEmail = updatedContract.client_email as string;
      var clientName = updatedContract.client_name as string;
      var contractNumber = updatedContract.contract_number as string;
      if (clientEmail) {
        await sendEmail({
          to: clientEmail,
          subject: "Contrato " + contractNumber + " firmado — Mtsprz",
          html: contractSignedEmail(clientName, contractNumber, pdfLink),
        });
      }
      var adminEmail = import.meta.env.RESEND_TO || "contacto@mtsprz.org";
      var adminLink = (import.meta.env.SITE || "https://mtsprz.org") + "/admin/contratos/" + contractId;
      await sendEmail({
        to: adminEmail,
        subject: "Cliente firm\u00f3 contrato " + contractNumber + " — Mtsprz",
        html: '<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a0b;color:#fafafa;padding:32px;border-radius:16px;"><h2 style="margin:0 0 16px;">Cliente Firm\u00f3 Contrato</h2><p style="font-size:14px;color:rgba(250,250,250,0.7);">' + clientName + " ha firmado el contrato <strong>" + contractNumber + '</strong>.</p><div style="text-align:center;margin-top:24px;"><a href="' + adminLink + '" style="display:inline-block;padding:14px 32px;border-radius:9999px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);">Ver Contrato</a></div></div>',
      });
    } catch (emailErr) {
      console.error("[SignByToken] Email error:", emailErr);
    }

    return new Response(JSON.stringify({ success: true, contract: updatedContract }), { status: 200 });
  } catch (err) {
    console.error("[Contracts] Sign by token error:", err);
    return new Response(JSON.stringify({ error: "Error al firmar contrato" }), { status: 500 });
  }
};
