import type { APIRoute } from "astro";
import { listLeads } from "../../../lib/leads";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  try {
    const { leads } = await listLeads({ limit: 5000 });

    // Build CSV
    const headers = ["ID", "Nombre", "Teléfono", "Email", "Fuente", "Servicio", "Mensaje", "Estado", "Notas", "Creado", "Actualizado"];
    const rows = leads.map((l) =>
      [
        l.id,
        escapeCsv(l.name),
        escapeCsv(l.phone || ""),
        escapeCsv(l.email || ""),
        l.source,
        escapeCsv(l.service_interest || ""),
        escapeCsv(l.message || ""),
        l.status,
        escapeCsv(l.notes || ""),
        l.created_at,
        l.updated_at,
      ].join(",")
    );

    const csv = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n"); // BOM for Excel

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-mtsprz-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error("[Leads] Export error:", err);
    return new Response(JSON.stringify({ error: "Error al exportar leads" }), { status: 500 });
  }
};

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
