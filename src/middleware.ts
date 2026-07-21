import { defineMiddleware } from "astro:middleware";
import { verifyToken } from "./lib/crypto";

export const onRequest = defineMiddleware(async (context, next) => {
  if (!context.isPrerendered) {
    const token = context.cookies.get("mtsprz_token")?.value;
    const authHeader = context.request.headers.get("authorization")?.replace("Bearer ", "");
    const jwt = token || authHeader;

    if (jwt) {
      const payload = verifyToken<{ id: number; email: string; role: string }>(jwt);
      if (payload) {
        context.locals.user = {
          id: payload.id,
          email: payload.email,
          role: payload.role as "client" | "super_admin",
        };
      }
    }

    const path = context.url.pathname;
    const adminPaths = ["/admin"];

    if (adminPaths.some((p) => path.startsWith(p))) {
      if (!context.locals.user || context.locals.user.role !== "super_admin") {
        if (context.request.headers.get("accept")?.includes("text/html")) {
          return context.redirect("/login?redirect=" + encodeURIComponent(path));
        }
        return new Response(JSON.stringify({ error: "No autorizado" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  return next();
});
