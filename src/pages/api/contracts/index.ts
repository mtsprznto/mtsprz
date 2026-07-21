import type { APIRoute } from "astro";
import { query, initDb } from "../../../lib/db";
import { generateContractNumber } from "../../../lib/contract-number";
import { generateToken } from "../../../lib/crypto";
import { validateEmail } from "../../../lib/validators";
import { sendEmail, contractCreatedEmail, adminNewContractNotification } from "../../../lib/mail";

export const prerender = false;

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
};

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401, headers: JSON_HEADERS });
  }

  try {
    await initDb();
    const isAdmin = locals.user.role === "super_admin";
    const statusFilter = url.searchParams.get("status");
    const search = url.searchParams.get("search");

    let sql = "SELECT * FROM contracts";
    const params: (string | number | boolean | null)[] = [];
    const conditions: string[] = [];

    if (!isAdmin) {
      conditions.push("user_id = $" + (params.length + 1));
      params.push(locals.user.id);
    }

    if (statusFilter) {
      conditions.push("status = $" + (params.length + 1));
      params.push(statusFilter);
    }

    if (search) {
      conditions.push("(client_name ILIKE $" + (params.length + 1) + " OR contract_number ILIKE $" + (params.length + 2) + " OR client_email ILIKE $" + (params.length + 3) + ")");
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY created_at DESC";

    const result = await query(sql, params);
    return new Response(JSON.stringify({ contracts: result.rows }), { status: 200, headers: JSON_HEADERS });
  } catch (err) {
    console.error("[Contracts] List error:", err);
    return new Response(JSON.stringify({ error: "Error al listar contratos" }), { status: 500, headers: JSON_HEADERS });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403, headers: JSON_HEADERS });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400, headers: JSON_HEADERS });
  }

  const {
    template_id,
    user_id,
    client_name,
    client_rut,
    client_email,
    client_phone,
    client_address,
    company_name,
    services,
    total_amount,
    payment_terms,
    start_date,
    end_date,
    duration_months,
    schedule,
    special_clauses,
  } = body as any;

  if (!client_name || !client_email || !services || !total_amount) {
    return new Response(JSON.stringify({ error: "Nombre, email, servicios y total requeridos" }), { status: 400, headers: JSON_HEADERS });
  }

  if (!validateEmail(client_email)) {
    return new Response(JSON.stringify({ error: "Email inválido" }), { status: 400, headers: JSON_HEADERS });
  }

  try {
    await initDb();
    const contractNumber = await generateContractNumber();
    const signingToken = generateToken(48);
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

    const result = await query(
      `INSERT INTO contracts (
        template_id, user_id, contract_number, status,
        client_name, client_rut, client_email, client_phone, client_address, company_name,
        services, total_amount, payment_terms,
        start_date, end_date, duration_months, schedule, special_clauses,
        signing_token, token_expires_at
      ) VALUES ($1,$2,$3,'pending',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
      [
        template_id || null,
        user_id || null,
        contractNumber,
        client_name,
        client_rut || null,
        client_email,
        client_phone || null,
        client_address || null,
        company_name || null,
        JSON.stringify(services),
        total_amount,
        payment_terms || null,
        start_date || null,
        end_date || null,
        duration_months || null,
        schedule || null,
        special_clauses || null,
        signingToken,
        expiresAt,
      ]
    );

    const contract = result.rows[0] as Record<string, unknown>;

    await query(
      "INSERT INTO signing_events (contract_id, event_type, metadata) VALUES ($1, 'created', $2)",
      [contract.id as number, JSON.stringify({ created_by: locals.user.id })]
    );

    const signLink = `${import.meta.env.SITE || "https://mtsprz.org"}/firmar/${signingToken}`;
    const adminLink = `${import.meta.env.SITE || "https://mtsprz.org"}/admin/contratos/${contract.id}`;

    await sendEmail({
      to: client_email,
      subject: `Contrato ${contractNumber} por firmar — Mtsprz`,
      html: contractCreatedEmail(client_name, contractNumber as string, signLink),
    });

    await sendEmail({
      to: import.meta.env.RESEND_TO || "contacto@mtsprz.org",
      subject: `Nuevo contrato ${contractNumber} enviado a ${client_name}`,
      html: adminNewContractNotification(client_name, contractNumber as string, adminLink),
    });

    return new Response(JSON.stringify({ success: true, contract }), { status: 201, headers: JSON_HEADERS });
  } catch (err) {
    console.error("[Contracts] Create error:", err);
    return new Response(JSON.stringify({ error: "Error al crear contrato" }), { status: 500, headers: JSON_HEADERS });
  }
};
