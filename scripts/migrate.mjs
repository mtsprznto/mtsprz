import { neon } from "@neondatabase/serverless";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "..", "migrations");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

if (!existsSync(MIGRATIONS_DIR)) {
  console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
  process.exit(1);
}

const db = neon(DATABASE_URL);

async function query(sql, params) {
  try {
    const rows = await db.query(sql, params ?? []);
    return rows;
  } catch (err) {
    console.error("[Migrate] Query error:", err);
    throw err;
  }
}

async function runMigrations() {
  // ensure tracking table
  await query(`CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW()
  )`);

  // load migration files
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("📭 No migration files found");
    return;
  }

  // get already applied
  const applied = await query("SELECT name FROM _migrations ORDER BY name");
  const appliedSet = new Set(applied.map((r) => r.name));

  const pending = files
    .map((f) => ({ name: f.replace(/\.sql$/, ""), file: f }))
    .filter((m) => !appliedSet.has(m.name));

  if (pending.length === 0) {
    console.log(`✅ All ${files.length} migrations applied`);
    return;
  }

  console.log(`\n📦 ${pending.length} pending migration(s):`);
  for (const m of pending) {
    console.log(`   · ${m.name}`);
  }
  console.log("");

  for (const m of pending) {
    process.stdout.write(`▶ Applying ${m.name}...`);
    try {
      const sql = readFileSync(join(MIGRATIONS_DIR, m.file), "utf-8");
      const statements = sql.split(";").map((s) => s.trim()).filter((s) => s.length > 0);

      for (const stmt of statements) {
        await query(stmt);
      }

      await query("INSERT INTO _migrations (name) VALUES ($1)", [m.name]);
      process.stdout.write(" ✅\n");
    } catch (err) {
      process.stdout.write(" ❌\n");
      console.error(err);
      process.exit(1);
    }
  }

  console.log(`\n✅ Migration complete`);
}

runMigrations();
