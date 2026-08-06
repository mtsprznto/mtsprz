/**
 * POST /api/reviews/request · Solicitud manual de reseña Google (J1).
 *
 * Admin-only. Al entregar un proyecto se llama con day=3 (entusiasmo) y
 * a los 10 días con day=10 (recordatorio). La tabla review_requests
 * evita duplicados (mismo cliente + day).
 */

import type { APIRoute } from "astro";
import { requestReview } from "../../../lib/marketing/reviews";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  const clientName = String(body.clientName || body.name || "").trim();
  const clientEmail = String(body.clientEmail || body.email || "").trim().toLowerCase();
  const project = body.project ? String(body.project).trim() : "tu proyecto";
  const day = body.day === 10 ? 10 : 3;

  if (!clientName || !clientEmail) {
    return new Response(JSON.stringify({ error: "Nombre y correo requeridos" }), { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return new Response(JSON.stringify({ error: "Correo electrónico inválido" }), { status: 400 });
  }
  if (clientName.length > 255 || clientEmail.length > 254 || project.length > 255) {
    return new Response(JSON.stringify({ error: "Campos demasiado largos" }), { status: 400 });
  }

  try {
    const result = await requestReview({ clientName, clientEmail, project, day });
    return new Response(JSON.stringify(result), {
      status: result.status === "failed" ? 500 : 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Reviews] Error:", err);
    return new Response(JSON.stringify({ error: "Error al solicitar reseña" }), { status: 500 });
  }
};
