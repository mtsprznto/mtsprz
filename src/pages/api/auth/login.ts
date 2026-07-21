import type { APIRoute } from "astro";
import { query, initDb } from "../../../lib/db";
import { verifyPassword, createToken } from "../../../lib/crypto";
import { validateEmail } from "../../../lib/validators";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "Email y contraseña requeridos" }), { status: 400 });
  }

  if (!validateEmail(email)) {
    return new Response(JSON.stringify({ error: "Email inválido" }), { status: 400 });
  }

  try {
    await initDb();
    const result = await query("SELECT id, email, password_hash, name, role, rut FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Credenciales inválidas" }), { status: 401 });
    }

    const user = result.rows[0] as Record<string, unknown>;
    const valid = await verifyPassword(password, user.password_hash as string);

    if (!valid) {
      return new Response(JSON.stringify({ error: "Credenciales inválidas" }), { status: 401 });
    }

    const token = createToken({ id: user.id, email: user.email, role: user.role });

    cookies.set("mtsprz_token", token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 86400 * 7,
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          rut: user.rut,
        },
        token,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("[Auth] Login error:", err);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};
