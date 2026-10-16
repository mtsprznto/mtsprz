/**
 * Taxonomía de categorías del blog · fuente única de verdad
 * (usada por /blog y /blog/[slug] — DESIGN §2.3: acento solo como punto guía, nunca texto)
 */

/** Etiqueta de categoría derivada de los tags del post. */
export function getCategoryLabel(tags: string[]): string {
  const lower = tags.map((t) => t.toLowerCase());
  if (lower.some((t) => ["seo", "seo local", "google maps", "posicionamiento"].includes(t)))
    return "SEO LOCAL";
  if (
    lower.some((t) =>
      ["automatización", "whatsapp", "bot", "crm", "email marketing"].includes(t)
    )
  )
    return "AUTOMATIZACIÓN";
  if (
    lower.some((t) =>
      ["desarrollo web", "astro", "wordpress", "velocidad", "paginas web"].includes(t)
    )
  )
    return "DESARROLLO WEB";
  if (lower.some((t) => ["marketing digital", "agencia digital", "marketing"].includes(t)))
    return "MARKETING";
  return "DIGITAL";
}

/** Acento por categoría (DESIGN §2.3) — uso puntual: punto guía en labels, nunca texto. */
export function getCategoryAccent(tags: string[]): string {
  switch (getCategoryLabel(tags)) {
    case "SEO LOCAL":
      return "#22E584";
    case "AUTOMATIZACIÓN":
      return "#22D3EE";
    case "DESARROLLO WEB":
      return "#00FF66";
    case "MARKETING":
      return "#EAB308";
    default:
      return "#A855F7";
  }
}

/** Tiempo de lectura estimado (200 palabras/min, mínimo 1 min). */
export function readingTime(text: string): number {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
