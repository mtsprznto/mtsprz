import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }

  let body: { data?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  if (!body.data || !body.type) {
    return new Response(JSON.stringify({ error: "Datos y tipo requeridos" }), { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024;
  const rawSize = Buffer.byteLength(body.data, "base64");
  if (rawSize > maxSize) {
    return new Response(JSON.stringify({ error: "Archivo muy grande (máx 5MB)" }), { status: 400 });
  }

  const allowedTypes = ["id_front", "id_back", "selfie", "signature"];
  if (!allowedTypes.includes(body.type)) {
    return new Response(JSON.stringify({ error: "Tipo no permitido" }), { status: 400 });
  }

  return new Response(
    JSON.stringify({ success: true, message: "Archivo recibido correctamente" }),
    { status: 200 }
  );
};
