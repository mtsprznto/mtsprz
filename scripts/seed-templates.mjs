// Seed: inserta plantillas de contrato en contract_templates
// Uso: node scripts/seed-templates.mjs

import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
try {
  const envPath = join(__dirname, "..", ".env");
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch { /* ignore */ }

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

const db = neon(DATABASE_URL);

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

async function runSeed() {
  console.log("\n🌱 Seeding contract templates...\n");

  let created = 0;
  let skipped = 0;

  for (const tpl of templates) {
    try {
      const existing = await db.query(
        "SELECT id FROM contract_templates WHERE name = $1",
        [tpl.name]
      );

      if (existing.length === 0) {
        await db.query(
          "INSERT INTO contract_templates (name, type, description, content_json) VALUES ($1, $2, $3, $4)",
          [tpl.name, tpl.type, tpl.description, JSON.stringify(tpl.content_json)]
        );
        console.log(`  ✅ ${tpl.name}`);
        created++;
      } else {
        console.log(`  ⏭️  ${tpl.name} (already exists)`);
        skipped++;
      }
    } catch (err) {
      console.error(`  ❌ ${tpl.name}: ${err.message}`);
    }
  }

  console.log(`\n📦 Done: ${created} created, ${skipped} skipped\n`);
}

runSeed();
