/**
 * Normalización de teléfonos al formato wa.me (solo dígitos, con código de país).
 *
 * - "+56 9 9844 1444"  → "56998441444"
 * - "56 9 9844 1444"   → "56998441444"
 * - "9 9844 1444"      → "56998441444"  (móvil local chileno)
 * - "56998441444"      → "56998441444"
 * - "" / null          → null
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  // Móvil chileno sin código de país (9XXXXXXXX) → anteponer 56
  if (digits.length === 9 && digits.startsWith("9")) return "56" + digits;
  return digits;
}
