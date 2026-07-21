import { neon } from "@neondatabase/serverless";

export interface DbResult {
  rows: Record<string, unknown>[];
}

let db: ReturnType<typeof neon> | null = null;
let migrationsRan = false;

function getDb() {
  if (!db) {
    const databaseUrl = import.meta.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL no configurada");
    db = neon(databaseUrl);
  }
  return db;
}

export async function query(sql: string, params?: (string | number | boolean | null)[]): Promise<DbResult> {
  const rows = await getDb().query(sql, params ?? []);
  return { rows: rows as Record<string, unknown>[] };
}

export async function initDb(): Promise<void> {
  if (migrationsRan) return;

  await getDb().query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("[DB] Tracking table ready");

  const { runMigrations } = await import("./migrate");
  await runMigrations();
  migrationsRan = true;
}
