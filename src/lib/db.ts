export interface DbResult {
  rows: Record<string, unknown>[];
  error?: string;
}

function parseConnectionUrl(url: string): { host: string; user: string; password: string; database: string } | null {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
    };
  } catch {
    return null;
  }
}

export async function query(sql: string, params?: (string | number | boolean | null)[]): Promise<DbResult> {
  const databaseUrl = import.meta.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log(`[DB] No DATABASE_URL set. Query: ${sql}`, params);
    return { rows: [] };
  }

  const info = parseConnectionUrl(databaseUrl);
  if (!info) {
    return { rows: [], error: "Invalid DATABASE_URL" };
  }

  try {
    const res = await fetch(`https://${info.host}/sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${info.password}`,
      },
      body: JSON.stringify({
        query: sql,
        params: params ?? [],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { rows: [], error: `Neon HTTP error: ${res.status} ${text}` };
    }

    const data = await res.json();
    return { rows: data.rows ?? [] };
  } catch (err) {
    return { rows: [], error: String(err) };
  }
}

export async function initDb(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS verified_emails (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      verified_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS quote_requests (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      services JSONB NOT NULL,
      total INT NOT NULL,
      message TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log("[DB] Tables initialized");
}
