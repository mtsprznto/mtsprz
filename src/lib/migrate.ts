import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "../../migrations");

let _sql: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!_sql) {
    const url = import.meta.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL no configurada");
    _sql = neon(url);
  }
  return _sql;
}

async function exec(sql: string, params?: (string | number | boolean | null)[]) {
  const rows = await getSql().query(sql, params ?? []);
  return rows as Record<string, unknown>[];
}

export async function runMigrations(): Promise<void> {
  // ensure tracking table
  await exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW()
  )`);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) return;

  const applied = await exec("SELECT name FROM _migrations ORDER BY name");
  const appliedSet = new Set(applied.map((r) => r.name as string));

  const pending = files
    .map((f) => ({ name: f.replace(/\.sql$/, ""), file: f }))
    .filter((m) => !appliedSet.has(m.name));

  if (pending.length === 0) return;

  for (const m of pending) {
    console.log(`[Migrate] Applying ${m.name}...`);
    const sqlContent = readFileSync(join(MIGRATIONS_DIR, m.file), "utf-8");
    const statements = sqlContent
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await exec(stmt);
    }

    await exec("INSERT INTO _migrations (name) VALUES ($1)", [m.name]);
    console.log(`[Migrate] ✓ ${m.name}`);
  }
}
