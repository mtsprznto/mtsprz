export function cleanRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, "");
}

export function formatRut(rut: string): string {
  const c = cleanRut(rut);
  if (c.length < 2) return c;
  const body = c.slice(0, -1);
  const dv = c.slice(-1).toUpperCase();
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formatted}-${dv}`;
}

export function validarRut(rut: string): boolean {
  const clean = cleanRut(rut);
  if (clean.length < 2 || clean.length > 10) return false;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  if (!/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const expected = remainder === 0 ? "0" : remainder === 1 ? "K" : String(11 - remainder);

  return dv === expected;
}

export function obtenerDigitoVerificador(rut: string): string {
  const clean = cleanRut(rut);
  const body = clean.length > 1 ? clean.slice(0, -1) : clean.replace(/[^0-9]/g, "");
  if (body.length === 0) return "";

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  return remainder === 0 ? "0" : remainder === 1 ? "K" : String(11 - remainder);
}
