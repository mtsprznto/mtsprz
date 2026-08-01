import type { APIRoute } from "astro";
import { query, initDb } from "../../lib/db";

export const prerender = false;

const templates = [
  {
    name: "Proyecto Único — Desarrollo Web",
    type: "proyecto_unico",
    description: "Para proyectos de desarrollo web: landing page, sitio profesional, ecommerce, etc.",
    content_json: {
      category: "Desarrollo Web",
      hasSchedule: false,
      defaultDurationMonths: 2,
    },
  },
  {
    name: "Servicio Recurrente — SEO/Marketing",
    type: "recurrente",
    description: "Para servicios mensuales: SEO local, redes sociales, Google Ads, mantenimiento.",
    content_json: {
      category: "Servicios Mensuales",
      hasSchedule: false,
      defaultDurationMonths: 3,
      renewable: true,
    },
  },
  {
    name: "Jornada Dedicada — Remoto",
    type: "jornada_dedicada",
    description: "Para clientes con horario fijo, como Blast-up Consulting Spa.",
    content_json: {
      category: "Jornada Dedicada",
      hasSchedule: true,
      defaultDurationMonths: 3,
      renewable: true,
    },
  },
  {
    name: "Diseño Gráfico — Proyecto",
    type: "proyecto_unico",
    description: "Para servicios de diseño: logo, identidad visual, branding.",
    content_json: {
      category: "Diseño Gráfico",
      hasSchedule: false,
      defaultDurationMonths: 1,
    },
  },
  {
    name: "Boleta de Honorarios — Prestación Servicios Profesionales",
    type: "boleta_honorarios",
    description: "Para contratos a honorarios con retención: persona natural emite boleta, cliente retiene 15,25% (Ley 21.133). Sin subordinación, sin entrega de código fuente, licencia revocable.",
    content_json: {
      category: "Honorarios",
      hasSchedule: true,
      defaultDurationMonths: 1,
      renewable: false,
      defaultRetentionRate: 15.25,
      defaultNetAmount: 450000,
    },
  },
];

export const POST: APIRoute = async ({ locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  try {
    await initDb();
    let count = 0;

    for (const tpl of templates) {
      const existing = await query("SELECT id FROM contract_templates WHERE name = $1", [tpl.name]);
      if (existing.rows.length === 0) {
        await query(
          "INSERT INTO contract_templates (name, type, description, content_json) VALUES ($1, $2, $3, $4)",
          [tpl.name, tpl.type, tpl.description, JSON.stringify(tpl.content_json)]
        );
        count++;
      }
    }

    return new Response(JSON.stringify({ success: true, created: count }), { status: 200 });
  } catch (err) {
    console.error("[Seed] Error:", err);
    return new Response(JSON.stringify({ error: "Error al sembrar plantillas" }), { status: 500 });
  }
};
