import type { APIRoute } from "astro";
import { verifyBiometric } from "../../../lib/biometric";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  const signing_token = body.signing_token as string | undefined;
  if (!signing_token) {
    return new Response(JSON.stringify({ error: "signing_token requerido" }), { status: 400 });
  }

  const result = verifyBiometric({
    signing_token,
    rut: body.rut as string | null,
    mrz_text: body.mrz_text as string | null,
    id_front_data: body.id_front_data as string | null,
    id_back_data: body.id_back_data as string | null,
    selfie_data: body.selfie_data as string | null,
    face_match_score: typeof body.face_match_score === "number" ? body.face_match_score : null,
    liveness_passed: body.liveness_passed === true,
  });

  return new Response(
    JSON.stringify({
      rut_valid: result.rut_valid,
      mrz_valid: result.mrz_valid,
      mrz_errors: result.mrz_errors,
      id_front_valid: result.id_front_valid,
      id_back_valid: result.id_back_valid,
      selfie_valid: result.selfie_valid,
      verification_token: result.verification_token,
    }),
    { status: 200 }
  );
};
