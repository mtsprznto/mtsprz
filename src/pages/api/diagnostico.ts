import type { APIRoute } from "astro";
import { query, initDb } from "../../lib/db";

export const prerender = false;

export const GET: APIRoute = async () => {
  await initDb();

  const schema = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'contracts'
    ORDER BY ordinal_position
  `);

  const migrations = await query("SELECT name, applied_at FROM _migrations ORDER BY name");

  const sample = await query(
    "SELECT id, contract_number, status, signing_token IS NOT NULL AS has_token, LEFT(signing_token::text, 20) AS token_prefix, token_expires_at FROM contracts ORDER BY id DESC LIMIT 5"
  );

  const missing = schema.rows.filter(
    (r) => !["signing_token", "token_expires_at"].includes(r.column_name as string)
  ).length === schema.rows.length
    ? "AMBOS faltan"
    : schema.rows.find((r) => r.column_name === "signing_token")
      ? "OK"
      : "signing_token falta";

  return new Response(
    JSON.stringify(
      {
        columns_total: schema.rows.length,
        columns: schema.rows.map((r) => r.column_name),
        has_signing_token: schema.rows.some((r) => r.column_name === "signing_token"),
        has_token_expires_at: schema.rows.some((r) => r.column_name === "token_expires_at"),
        status: missing,
        migrations,
        recent_contracts: sample.rows,
      },
      null,
      2
    ),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
