import crypto from "node:crypto";

/**
 * Secreto JWT · fail-closed:
 * En producción (PROD) si JWT_SECRET no está configurado, aborta el módulo.
 * En desarrollo usa fallback explícito (nunca válido en prod).
 */
const ENV = (import.meta as Record<string, any>).env ?? {};
const IS_PROD = ENV.PROD === true || ENV.PROD === "true";

const JWT_SECRET: string = (() => {
  const s = (ENV.JWT_SECRET as string | undefined)?.trim();
  if (s) return s;
  if (IS_PROD) {
    throw new Error("JWT_SECRET no configurada en producción · abortando (seguridad)");
  }
  console.warn("[CRYPTO] JWT_SECRET no configurada · usando fallback DEV (inseguro, solo local)");
  return "dev-secret-change-in-prod";
})();

/**
 * PBKDF2-SHA512 · OWASP ASVS v4.0 recomienda ≥600k iteraciones.
 * Se usa 310k (compromiso rendimiento/seguridad para login admin);
 * el formato incluye iteraciones → migración transparente de hashes antiguos.
 */
const PBKDF2_ITERATIONS = 310_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = "sha512";

/** Formato nuevo: pbkdf2$sha512$310000$<salt>$<key>. Antiguo: <salt>:<key> (1000 iter) */
export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST, (err, key) => {
      if (err) reject(err);
      resolve(`pbkdf2$${PBKDF2_DIGEST}$${PBKDF2_ITERATIONS}$${salt}$${key.toString("hex")}`);
    });
  });
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve) => {
    let salt: string;
    let expected: string;
    let iterations = PBKDF2_ITERATIONS;

    const parts = hash.split("$");
    if (parts.length === 5 && parts[0] === "pbkdf2") {
      // Formato versionado: pbkdf2$sha512$iter$salt$key
      iterations = Number(parts[2]) || PBKDF2_ITERATIONS;
      salt = parts[3];
      expected = parts[4];
    } else {
      // Formato legacy: salt:key (1000 iteraciones)
      const legacy = hash.split(":");
      if (legacy.length !== 2) return resolve(false);
      salt = legacy[0];
      expected = legacy[1];
      iterations = 1000;
    }

    crypto.pbkdf2(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST, (err, derivedKey) => {
      if (err) return resolve(false);
      const a = Buffer.from(derivedKey.toString("hex"));
      const b = Buffer.from(expected);
      if (a.length !== b.length) return resolve(false);
      resolve(crypto.timingSafeEqual(a, b));
    });
  });
}

/** True si el hash usa formato antiguo (1000 iter) · re-hashear en el próximo login. */
export function needsRehash(hash: string): boolean {
  return !hash.startsWith("pbkdf2$");
}

function base64url(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function parseDuration(d: string): number {
  const match = d.match(/^(\d+)([smhd])$/);
  if (!match) return 86400 * 7;
  const num = parseInt(match[1]);
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return num * (multipliers[match[2]] ?? 86400);
}

export function createToken(payload: Record<string, unknown>, expiresIn = "7d"): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + parseDuration(expiresIn) };

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${base64url(header)}.${base64url(fullPayload)}`)
    .digest("base64url");

  return `${base64url(header)}.${base64url(fullPayload)}.${signature}`;
}

export function verifyToken<T>(token: string): T | null {
  try {
    const [headerB64, payloadB64, signature] = token.split(".");
    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload as T;
  } catch {
    return null;
  }
}

export function generateToken(length = 48): string {
  return crypto.randomBytes(length).toString("hex");
}
