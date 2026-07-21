import type { APIRoute } from "astro";
import { query, initDb } from "../../../../lib/db";
import { generateContractPdf } from "../../../../lib/contract-pdf";
import crypto from "node:crypto";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const { id } = params;

  if (!locals.user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }

  try {
    await initDb();
    const result = await query("SELECT * FROM contracts WHERE id = $1", [Number(id)]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Contrato no encontrado" }), { status: 404 });
    }

    const c = result.rows[0] as Record<string, unknown>;

    if (locals.user.role !== "super_admin" && c.user_id !== locals.user.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
    }

    const services = (c.services as any[]) || [];

    const contractData = {
      contractNumber: c.contract_number as string,
      clientName: c.client_name as string,
      clientRut: (c.client_rut as string) || "",
      clientEmail: c.client_email as string,
      clientPhone: (c.client_phone as string) || "",
      clientAddress: (c.client_address as string) || "",
      companyName: (c.company_name as string) || (c.client_name as string),
      services: services.map((s: any) => ({
        id: s.id || "",
        name: s.name || "",
        description: s.description || "",
        price: s.price || 0,
      })),
      totalAmount: c.total_amount as number,
      paymentTerms: (c.payment_terms as string) || "",
      startDate: c.start_date ? new Date(c.start_date as string).toLocaleDateString("es-CL") : "",
      endDate: c.end_date ? new Date(c.end_date as string).toLocaleDateString("es-CL") : "",
      durationMonths: (c.duration_months as number) || 1,
      schedule: (c.schedule as string) || "",
      specialClauses: (c.special_clauses as string) || "",
      templateType: "",
      createdAt: c.created_at ? new Date(c.created_at as string).toLocaleDateString("es-CL") : "",
      adminSignature: (c.admin_signature_data as string) || undefined,
      clientSignature: (c.client_signature_data as string) || undefined,
      adminSignedAt: c.admin_signed_at ? new Date(c.admin_signed_at as string).toLocaleString("es-CL") : undefined,
      clientSignedAt: c.client_signed_at ? new Date(c.client_signed_at as string).toLocaleString("es-CL") : undefined,
    };

    const pdfBytes = await generateContractPdf(contractData);
    const pdfBuffer = Buffer.from(pdfBytes);

    const pdfHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    if (!c.pdf_hash || c.pdf_hash !== pdfHash) {
      await query("UPDATE contracts SET pdf_hash = $1 WHERE id = $2", [pdfHash, Number(id)]);
    }

    await query(
      "INSERT INTO signing_events (contract_id, event_type, metadata) VALUES ($1, 'pdf_downloaded', $2)",
      [Number(id), JSON.stringify({ user_id: locals.user.id, hash: pdfHash })]
    );

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${c.contract_number}.pdf"`,
        "X-PDF-Hash": pdfHash,
      },
    });
  } catch (err) {
    console.error("[Contracts] PDF error:", err);
    return new Response(JSON.stringify({ error: "Error al generar PDF" }), { status: 500 });
  }
};
