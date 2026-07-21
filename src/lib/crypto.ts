import crypto from "node:crypto";

const JWT_SECRET = (import.meta as Record<string, any>).env?.JWT_SECRET ?? "dev-secret-change-in-prod";

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.pbkdf2(password, salt, 1000, 64, "sha512", (err, key) => {
      if (err) reject(err);
      resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.pbkdf2(password, salt, 1000, 64, "sha512", (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString("hex") === key);
    });
  });
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

    if (signature !== expectedSig) return null;

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
