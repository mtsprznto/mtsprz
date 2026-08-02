import type { APIRoute } from "astro";

export const prerender = false;

/**
 * M3: endpoint deprecado — nunca implementó almacenamiento real.
 * Devuelve 501 explícito para que ningún cliente crea que el archivo se guardó.
 * El flujo real de firma guarda vía /api/contracts/sign-by-token.
 */
export const POST: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
  }

  return new Response(
    JSON.stringify({ error: "Endpoint deprecado: el almacenamiento no está implementado. Usa /api/contracts/sign-by-token." }),
    { status: 501 }
  );
};
