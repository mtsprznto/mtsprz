import type { APIRoute } from "astro";
import { listLeads, createLead } from "../../../lib/leads";
import { checkRateLimit } from "../../../lib/rate-limit";
import { notifyAdmin } from "../../../lib/whatsapp";
import { normalizePhone } from "../../../lib/phone";
import { sendEmail, leadReceivedEmail, adminNewLeadEmail } from "../../../lib/mail";

export const prerender = false;

const ADMIN_EMAIL = import.meta.env.RESEND_TO || "contacto@mtsprz.org";

/** GET /api/leads — List leads (admin only) */
export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user || locals.user.role !== "super_admin") {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  const status = url.searchParams.get("status") || undefined;
  const source = url.searchParams.get("source") || undefined;
  const search = url.searchParams.get("search") || undefined;

  // Paginación: page/per_page (preferido) con fallback limit/offset (compat)
  const page = Math.max(Math.floor(Number(url.searchParams.get("page")) || 1), 1);
  const perPage = Math.min(Math.max(Math.floor(Number(url.searchParams.get("per_page")) || 10), 1), 200);
  const limit = url.searchParams.has("limit")
    ? Math.min(Number(url.searchParams.get("limit")) || 50, 200)
    : perPage;
  const offset = url.searchParams.has("offset")
    ? Number(url.searchParams.get("offset")) || 0
    : (page - 1) * perPage;

  try {
    const result = await listLeads({ status, source, search, limit, offset });
    const totalPages = Math.max(Math.ceil(result.total / perPage), 1);
    return new Response(
      JSON.stringify({
        leads: result.leads,
        total: result.total,
        stats: result.stats,
        page,
        per_page: perPage,
        total_pages: totalPages,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
      }
    );
  } catch (err) {
    console.error("[Leads] List error:", err);
    return new Response(JSON.stringify({ error: "Error al listar leads" }), { status: 500 });
  }
};

/** POST /api/leads — Create lead (public, from forms; admin bypasses rate limit) */
export const POST: APIRoute = async ({ request, locals }) => {
  // Admin (prospector sync, manual creation) bypasses the public rate limit
  const isAdmin = locals.user?.role === "super_admin";
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!isAdmin) {
    // Rate limit: 5 per IP per hour
    const rateCheck = checkRateLimit(`lead-create:ip:${clientIp}`, 5, 3600_000);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "Demasiadas solicitudes. Intenta en 1 hora." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  const name = String(body.name || "").trim();
  const email = body.email ? String(body.email).trim().toLowerCase() : null;

  // Newsletter: suscripción email-only permitida (name = email como fallback)
  if (!name && !email) {
    return new Response(JSON.stringify({ error: "Nombre o correo requerido" }), { status: 400 });
  }
  const finalName = name || email || "Suscriptor";

  const phone = normalizePhone(body.phone ? String(body.phone).trim() : null);
  // Coerce unknown sources to 'web' (DB CHECK constraint)
  const VALID_SOURCES = ["whatsapp", "web", "contact", "quote", "google_maps", "manual"];
  const sourceRaw = String(body.source || "web").trim();
  const source = (VALID_SOURCES.includes(sourceRaw) ? sourceRaw : "web") as
    | "whatsapp" | "web" | "contact" | "quote" | "google_maps" | "manual";
  const serviceInterest = body.service_interest ? String(body.service_interest).trim() : null;
  const message = body.message ? String(body.message).trim() : null;

  // Basic email validation
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Correo electrónico inválido" }), { status: 400 });
  }

  // Field size limits
  if (finalName.length > 255) {
    return new Response(JSON.stringify({ error: "Nombre demasiado largo" }), { status: 400 });
  }
  if (message && message.length > 5000) {
    return new Response(JSON.stringify({ error: "Mensaje demasiado largo" }), { status: 400 });
  }

  try {
    // Merge caller-provided metadata (prospector: score, rubro, fuente...) with request info
    const metadata: Record<string, unknown> = {};
    if (body.metadata && typeof body.metadata === "object") {
      Object.assign(metadata, body.metadata as Record<string, unknown>);
    }
    // Capture UTM params if present in the body
    if (body.utm_source) metadata.utm_source = body.utm_source;
    if (body.utm_medium) metadata.utm_medium = body.utm_medium;
    if (body.utm_campaign) metadata.utm_campaign = body.utm_campaign;
    metadata.ip = clientIp ?? null;
    metadata.user_agent = request.headers.get("user-agent") || null;

    const lead = await createLead({
      name: finalName,
      phone,
      email,
      source,
      service_interest: serviceInterest,
      message: message,
      metadata,
    });

    // Notify admin via WhatsApp
    notifyAdmin(lead.name, phone || email || "—", serviceInterest, message).catch(() => {});

    // Email de confirmación al prospecto (si dejó correo)
    if (lead.email) {
      await sendEmail({
        to: lead.email,
        subject: "Recibimos tu solicitud — diagnóstico gratis",
        html: leadReceivedEmail(lead.name, serviceInterest),
        fromName: "Mtsprz",
      });
    }

    // Email de notificación al admin (backup de WhatsApp)
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Nuevo lead: ${lead.name}`,
      html: adminNewLeadEmail({
        name: lead.name,
        phone,
        email,
        source,
        serviceInterest,
        message,
        createdAt: lead.created_at,
      }),
      fromName: "Mtsprz",
      replyTo: email || undefined,
    });

    return new Response(JSON.stringify({ success: true, lead: { id: lead.id } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Leads] Create error:", err);
    return new Response(JSON.stringify({ error: "Error al guardar lead" }), { status: 500 });
  }
};
