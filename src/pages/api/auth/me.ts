import type { APIRoute } from "astro";
import { query } from "../../../lib/db";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }

  try {
    const result = await query(
      "SELECT id, email, name, role, rut, phone, created_at FROM users WHERE id = $1",
      [locals.user.id]
    );

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: "Usuario no encontrado" }), { status: 404 });
    }

    return new Response(JSON.stringify({ user: result.rows[0] }), { status: 200 });
  } catch (err) {
    console.error("[Auth] Me error:", err);
    return new Response(JSON.stringify({ error: "Error interno" }), { status: 500 });
  }
};
