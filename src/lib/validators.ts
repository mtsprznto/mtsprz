export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateRut(rut: string): boolean {
  return /^\d{7,8}-[\dkK]$/.test(rut);
}

export function validatePhone(phone: string): boolean {
  return /^\+?56?\d{9,11}$/.test(phone.replace(/\s/g, ""));
}

export function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/** Strips __proto__, constructor, and prototype keys to prevent Prototype Pollution */
export function sanitizeBody<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeBody) as unknown as T;
  if (typeof obj === "object") {
    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      clean[key] = sanitizeBody((obj as Record<string, unknown>)[key]);
    }
    return clean as T;
  }
  return obj;
}

/** Validates that a value is a string of exactly N digits. Prevents NoSQL injection via non-string types. */
export function isValidCode(value: unknown, length = 6): value is string {
  return typeof value === "string" && /^\d+$/.test(value) && value.length === length;
}

/** Validates request body size to prevent abuse */
export function validateBodySize(body: unknown, maxBytes = 65536): boolean {
  try {
    return JSON.stringify(body).length <= maxBytes;
  } catch {
    return false;
  }
}
