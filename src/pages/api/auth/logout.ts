import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete("mtsprz_token", { path: "/" });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
