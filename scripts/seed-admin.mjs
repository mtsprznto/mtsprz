import { readFileSync, existsSync } from "node:fs";
import { randomBytes, pbkdf2Sync } from "node:crypto";

function loadEnv(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

function makeBearerToken(dbUrl) {
  const u = new URL(dbUrl);
  u.searchParams.delete("sslmode");
  u.searchParams.delete("sslcert");
  return u.toString().replace(/\/$/, "");
}

async function neonQuery(databaseUrl, sql, params) {
  const u = new URL(databaseUrl);
  const host = u.hostname;
  const bearer = makeBearerToken(databaseUrl);
  const res = await fetch(`https://${host}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({ query: sql, params: params ?? [] }),
  });
  if (!res.ok) throw new Error(`Neon error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.rows ?? [];
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${key}`;
}

async function main() {
  const env = loadEnv(".env");

  const email = env.SEED_ADMIN_EMAIL || env.ADMIN_EMAIL;
  const password = env.SEED_ADMIN_PASSWORD || env.ADMIN_PASSWORD;
  const name = env.SEED_ADMIN_NAME || env.ADMIN_NAME || "Administrador";
  const rut = env.SEED_ADMIN_RUT || env.ADMIN_RUT || null;

  if (!email || !password) {
    console.error("");
    console.error("  Para crear el super_admin, agrega estas variables a tu .env:");
    console.error("    SEED_ADMIN_EMAIL=admin@ejemplo.com");
    console.error("    SEED_ADMIN_PASSWORD=contraseña_segura");
    console.error("    SEED_ADMIN_NAME=Tu Nombre (opcional)");
    console.error("    SEED_ADMIN_RUT=12.345.678-9 (opcional)");
    console.error("");
    console.error("  Luego corre: node scripts/seed-admin.mjs");
    console.error("");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("  Error: SEED_ADMIN_PASSWORD debe tener al menos 8 caracteres");
    process.exit(1);
  }

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("  Error: DATABASE_URL no está definida en .env");
    process.exit(1);
  }

  try {
    console.log(" Conectando a Neon...");
    const existing = await neonQuery(
      databaseUrl,
      "SELECT id, email, role FROM users WHERE email = $1",
      [email]
    );

    if (existing.length > 0) {
      const user = existing[0];
      if (user.role === "super_admin") {
        console.log(`  El usuario ${email} ya es super_admin.`);
      } else {
        await neonQuery(
          databaseUrl,
          "UPDATE users SET role = 'super_admin' WHERE email = $1",
          [email]
        );
        console.log(`  Usuario ${email} actualizado a super_admin.`);
      }
      process.exit(0);
    }

    const passwordHash = hashPassword(password);
    const result = await neonQuery(
      databaseUrl,
      `INSERT INTO users (email, password_hash, name, rut, role)
       VALUES ($1, $2, $3, $4, 'super_admin')
       RETURNING id, email, name, role`,
      [email, passwordHash, name, rut]
    );

    if (result.length === 0) {
      console.error("  Error: No se pudo crear el usuario");
      process.exit(1);
    }

    const user = result[0];
    console.log(`  Super_admin creado exitosamente:`);
    console.log(`    ID:    ${user.id}`);
    console.log(`    Email: ${user.email}`);
    console.log(`    Name:  ${user.name}`);
    console.log(`    Role:  ${user.role}`);
    console.log("");
    console.log("  Ya puedes iniciar sesión en /login");
  } catch (err) {
    console.error("  Error:", err.message);
    process.exit(1);
  }
}

main();
