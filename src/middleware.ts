import { defineMiddleware } from "astro:middleware";
import { verifyToken } from "./lib/crypto";

const PUBLIC_API_ROUTES: string[] = [
  "/api/auth/",
  "/api/submit-quote",
  "/api/send-code",
  "/api/verify-code",
  "/api/contracts/find-by-token/",
  "/api/contracts/sign-by-token",
  "/api/biometric/verify",
  "/api/contact",
];

/** Patterns that match dynamic segments: /api/contracts/[id]/sign, /api/contracts/[id]/pdf */
const PUBLIC_API_PATTERNS: RegExp[] = [
  /^\/api\/contracts\/\d+\/sign$/,
  /^\/api\/contracts\/\d+\/pdf$/,
];

function isPublicApiRoute(path: string): boolean {
  if (PUBLIC_API_ROUTES.some((route) => path.startsWith(route) || path === route.replace(/\/$/, ""))) {
    return true;
  }
  if (PUBLIC_API_PATTERNS.some((pattern) => pattern.test(path))) {
    return true;
  }
  return false;
}

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

    // Admin routes: require super_admin
    if (path.startsWith("/admin")) {
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

    // API routes: require authentication unless in public whitelist
    if (path.startsWith("/api/") && !isPublicApiRoute(path)) {
      if (!context.locals.user) {
        return new Response(JSON.stringify({ error: "No autorizado" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  return next();
});
