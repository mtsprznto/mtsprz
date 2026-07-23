import type { APIRoute } from "astro";
import { Resend } from "resend";
import { checkRateLimit } from "../../lib/rate-limit";

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  // 🛡️ Rate limit: 3 contact messages per hour per IP
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit(`contact:ip:${clientIp}`, 3, 3600_000);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Demasiados mensajes. Intenta en 1 hora." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const data = await request.formData();
    const name = data.get("name")?.toString().trim();
    const email = data.get("email")?.toString().trim();
    const message = data.get("message")?.toString().trim();

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Todos los campos son obligatorios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate field sizes
    if (name.length > 200 || email.length > 254 || message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Campos demasiado largos" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Correo electrónico inválido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await resend.emails.send({
      from: import.meta.env.RESEND_FROM,
      to: import.meta.env.RESEND_TO,
      subject: `Nuevo contacto de ${name}`,
      replyTo: email,
      text: `Nombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`,
      html: `
        <h2>Nuevo mensaje desde el formulario de contacto</h2>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <hr />
        <p><strong>Mensaje:</strong></p>
        <p>${message.replace(/\n/g, "<br />")}</p>
      `,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Mensaje enviado correctamente" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: "Error al enviar el mensaje. Intenta nuevamente." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
