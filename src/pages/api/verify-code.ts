import type { APIRoute } from "astro";
import { query, initDb } from "../../lib/db";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: { email?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const code = body.code?.trim();

  if (!email || !code) {
    return new Response(JSON.stringify({ error: "Email y código requeridos" }), { status: 400 });
  }

  const store = (globalThis as any)._verificationCodes as Map<string, { code: string; expires: number }> | undefined;
  const stored = store?.get(email);

  if (!stored) {
    return new Response(JSON.stringify({ error: "Código no encontrado. Solicita uno nuevo." }), { status: 400 });
  }

  if (Date.now() > stored.expires) {
    store?.delete(email);
    return new Response(JSON.stringify({ error: "Código expirado. Solicita uno nuevo." }), { status: 400 });
  }

  if (stored.code !== code) {
    return new Response(JSON.stringify({ error: "Código incorrecto." }), { status: 400 });
  }

  store?.delete(email);

  try {
    await initDb();
    await query("INSERT INTO verified_emails (email) VALUES ($1) ON CONFLICT (email) DO NOTHING", [email]);
  } catch (err) {
    console.error("[DB] Failed to save email:", err);
  }

  cookies.set("mtsprz_verified", email, {
    path: "/",
    maxAge: 86400,
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
  });

  return new Response(JSON.stringify({ success: true, email }), { status: 200 });
};
