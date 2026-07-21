import crypto from "node:crypto";

const BIOMETRIC_SECRET =
  (import.meta as Record<string, any>).env?.BIOMETRIC_SECRET ??
  "biometric-secret-change-in-prod";

const TOKEN_TTL = 15 * 60; // 15 minutos

export interface VerificationClaims {
  signing_token: string;
  rut_valid: boolean;
  mrz_valid: boolean;
  has_id_front: boolean;
  has_id_back: boolean;
  has_selfie: boolean;
  id_front_hash: string;
  id_back_hash: string;
  selfie_hash: string;
  face_match_score: number | null;
  liveness_passed: boolean;
  exp: number;
}

function sha256Prefix(base64: string): string {
  return crypto
    .createHash("sha256")
    .update(Buffer.from(base64, "base64"))
    .digest("hex")
    .slice(0, 16);
}

function validateImage(dataUrl: string | null | undefined): { ok: boolean; base64: string } {
  if (!dataUrl?.startsWith("data:image/")) return { ok: false, base64: "" };
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return { ok: false, base64: "" };
  const b64 = dataUrl.slice(comma + 1);
  const bytes = Buffer.from(b64, "base64");
  // Mínimo 5KB — descarta imágenes fabricadas / vacías
  return { ok: bytes.length >= 5120, base64: b64 };
}

export function createVerificationToken(
  claims: Omit<VerificationClaims, "exp">
): string {
  const full: VerificationClaims = {
    ...claims,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL,
  };
  const data = JSON.stringify(full);
  const hmac = crypto
    .createHmac("sha256", BIOMETRIC_SECRET)
    .update(data)
    .digest("hex");
  return Buffer.from(JSON.stringify({ data, hmac })).toString("base64url");
}

export function decodeVerificationToken(token: string): VerificationClaims | null {
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString());
    const { data, hmac } = parsed as { data: string; hmac: string };
    const expected = crypto
      .createHmac("sha256", BIOMETRIC_SECRET)
      .update(data)
      .digest("hex");
    // timing-safe compare
    const bufA = Buffer.from(hmac.padEnd(64, "0").slice(0, 64), "hex");
    const bufB = Buffer.from(expected.padEnd(64, "0").slice(0, 64), "hex");
    if (!crypto.timingSafeEqual(bufA, bufB)) return null;
    // re-check exact length after safe compare
    if (hmac !== expected) return null;
    const claims: VerificationClaims = JSON.parse(data);
    if (claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

// ── RUT mod-11 server-side
export function serverValidateRut(rut: string): boolean {
  const clean = rut.replace(/[^0-9kK]/g, "");
  if (clean.length < 2 || clean.length > 10) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  if (!/^\d+$/.test(body)) return false;
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rem = sum % 11;
  const expected = rem === 0 ? "0" : rem === 1 ? "K" : String(11 - rem);
  return dv === expected;
}

// ── MRZ ICAO TD1 checksums server-side
const MRZ_ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function mrzCharVal(c: string): number {
  return c === "<" ? 0 : Math.max(0, MRZ_ALPHA.indexOf(c));
}
const MRZ_W = [7, 3, 9];
function mrzChecksum(field: string): number {
  let s = 0;
  for (let i = 0; i < field.length; i++) s += mrzCharVal(field[i]) * MRZ_W[i % 3];
  return s % 10;
}

export function serverValidateMrz(mrz: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = mrz
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.length > 0);

  if (lines.length < 3) {
    errors.push("Debe tener 3 líneas");
    return { valid: false, errors };
  }

  const l1 = lines[0].padEnd(30, "<").slice(0, 30);
  const l2 = lines[1].padEnd(30, "<").slice(0, 30);

  if (!l1.startsWith("ID")) errors.push("Tipo de documento debe ser ID");
  if (l1.substring(2, 5) !== "CHL") errors.push("País debe ser CHL");

  if (l1[14] !== "<" && mrzChecksum(l1.substring(5, 14)) !== parseInt(l1[14], 10))
    errors.push("Checksum número de documento inválido");

  if (l2[6] !== "<" && mrzChecksum(l2.substring(0, 6)) !== parseInt(l2[6], 10))
    errors.push("Checksum fecha nacimiento inválido");

  if (l2[14] !== "<" && mrzChecksum(l2.substring(8, 14)) !== parseInt(l2[14], 10))
    errors.push("Checksum vencimiento inválido");

  // Composite check digit (posición 29 de línea 2)
  const compositeCheck = l2[29];
  if (compositeCheck !== "<" && /^\d$/.test(compositeCheck)) {
    const compositeData =
      l1.substring(0, 14) +
      l1.substring(15, 29) +
      l2.substring(0, 6) +
      l2[7] +
      l2.substring(8, 14) +
      l2.substring(15, 28);
    if (mrzChecksum(compositeData) !== parseInt(compositeCheck, 10))
      errors.push("Checksum compuesto inválido");
  }

  return { valid: errors.length === 0, errors };
}

// ── Función principal de verificación biométrica server-side
export interface VerifyBiometricInput {
  signing_token: string;
  rut?: string | null;
  mrz_text?: string | null;
  id_front_data?: string | null;
  id_back_data?: string | null;
  selfie_data?: string | null;
  face_match_score?: number | null;
  liveness_passed?: boolean;
}

export interface VerifyBiometricResult {
  rut_valid: boolean;
  mrz_valid: boolean;
  mrz_errors: string[];
  id_front_valid: boolean;
  id_back_valid: boolean;
  selfie_valid: boolean;
  verification_token: string;
}

export function verifyBiometric(input: VerifyBiometricInput): VerifyBiometricResult {
  const rut_valid = input.rut ? serverValidateRut(input.rut) : false;

  const mrz_result = input.mrz_text
    ? serverValidateMrz(input.mrz_text)
    : { valid: false, errors: [] as string[] };

  const front = validateImage(input.id_front_data);
  const back = validateImage(input.id_back_data);
  const selfie = validateImage(input.selfie_data);

  // face_match_score solo se acepta si ambas imágenes son reales (no fabricadas)
  const face_match_score =
    front.ok && selfie.ok ? (typeof input.face_match_score === "number" ? input.face_match_score : null) : null;
  const liveness_passed = selfie.ok ? (input.liveness_passed === true) : false;

  const token = createVerificationToken({
    signing_token: input.signing_token,
    rut_valid,
    mrz_valid: mrz_result.valid,
    has_id_front: front.ok,
    has_id_back: back.ok,
    has_selfie: selfie.ok,
    id_front_hash: front.ok ? sha256Prefix(front.base64) : "",
    id_back_hash: back.ok ? sha256Prefix(back.base64) : "",
    selfie_hash: selfie.ok ? sha256Prefix(selfie.base64) : "",
    face_match_score,
    liveness_passed,
  });

  return {
    rut_valid,
    mrz_valid: mrz_result.valid,
    mrz_errors: mrz_result.errors,
    id_front_valid: front.ok,
    id_back_valid: back.ok,
    selfie_valid: selfie.ok,
    verification_token: token,
  };
}
