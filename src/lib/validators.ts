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
