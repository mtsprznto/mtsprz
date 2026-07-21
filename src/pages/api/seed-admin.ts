import type { APIRoute } from "astro";
import { query, initDb } from "../../lib/db";
import { hashPassword } from "../../lib/crypto";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const seedKey = import.meta.env.SEED_ADMIN_KEY;
  if (!seedKey) {
    return new Response(JSON.stringify({ error: "SEED_ADMIN_KEY no configurada en .env" }), { status: 403 });
  }

  const authHeader = request.headers.get("x-seed-key");
  if (authHeader !== seedKey) {
    return new Response(JSON.stringify({ error: "x-seed-key inválido" }), { status: 403 });
  }

  const email = import.meta.env.SEED_ADMIN_EMAIL;
  const password = import.meta.env.SEED_ADMIN_PASSWORD;
  const name = import.meta.env.SEED_ADMIN_NAME || "Administrador";
  const rut = import.meta.env.SEED_ADMIN_RUT || null;

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: "Faltan SEED_ADMIN_EMAIL o SEED_ADMIN_PASSWORD en .env", success: false }),
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return new Response(JSON.stringify({ error: "SEED_ADMIN_PASSWORD debe tener al menos 8 caracteres" }), { status: 400 });
  }

  try {
    await initDb();

    const existing = await query("SELECT id, email, role FROM users WHERE email = $1", [email]);

    if (existing.rows.length > 0) {
      const user = existing.rows[0] as Record<string, unknown>;
      if (user.role === "super_admin") {
        return new Response(JSON.stringify({ success: true, message: `El usuario ${email} ya es super_admin.` }), { status: 200 });
      }
      await query("UPDATE users SET role = 'super_admin' WHERE email = $1", [email]);
      return new Response(JSON.stringify({ success: true, message: `Usuario ${email} actualizado a super_admin.` }), { status: 200 });
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      `INSERT INTO users (email, password_hash, name, rut, role)
       VALUES ($1, $2, $3, $4, 'super_admin')
       RETURNING id, email, name, role`,
      [email, passwordHash, name, rut]
    );

    if (result.error) {
      console.error("[Seed Admin] DB error:", result.error);
      return new Response(JSON.stringify({ error: result.error }), { status: 500 });
    }

    const user = result.rows[0] as Record<string, unknown> | undefined;
    if (!user) {
      console.error("[Seed Admin] INSERT returned no rows. Raw result:", JSON.stringify(result));
      const insert = await query("SELECT id, email, role FROM users WHERE email = $1", [email]);
      if (insert.rows.length > 0) {
        const existing = insert.rows[0] as Record<string, unknown>;
        return new Response(
          JSON.stringify({ success: true, message: `Usuario creado (recuperado con SELECT): ${existing.email}`, user: existing }),
          { status: 201 }
        );
      }
      return new Response(JSON.stringify({ error: "No se pudo crear el usuario" }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ success: true, message: `Super_admin creado: ${user.email}`, user }),
      { status: 201 }
    );
  } catch (err) {
    console.error("[Seed Admin] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
};
