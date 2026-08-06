/**
 * caso-visuals.ts · Visuales generativos compartidos para casos de estudio.
 * Única fuente de verdad para los gradientes + patrones SVG de cada caso.
 * Se usa en: CasoCard (showcase), TestimoniosReservados (butacas),
 * [slug].astro (hero cinematográfico).
 * La "imagen" es la tarjeta: capa abstracta por caso, sin fotos fake (J1).
 */

export interface CasoVisual {
  bg: string;
  pattern: string;
}

// Gradientes monocromáticos indigo/violeta/azul, consistentes con la marca.
// El color de la página viene de aquí; el texto es blanco translúcido.
export const VISUALS: Record<string, CasoVisual> = {
  "fie-inteligencia-educativa": {
    bg: "radial-gradient(130% 130% at 85% 0%, #312e81 0%, #1e1b4b 45%, #020617 100%)",
    pattern: "grid",
  },
  "blastup-email-ia": {
    bg: "radial-gradient(130% 130% at 15% 0%, #4c1d95 0%, #2e1065 45%, #020617 100%)",
    pattern: "dots",
  },
  "gestorpass-gestor-password": {
    bg: "radial-gradient(130% 130% at 60% 100%, #0c4a6e 0%, #082f49 45%, #020617 100%)",
    pattern: "diag",
  },
  "novablast-ia": {
    bg: "radial-gradient(130% 130% at 30% 30%, #1e40af 0%, #172554 50%, #020617 100%)",
    pattern: "cross",
  },
};

// Patrones SVG inline (blanco translúcido · textura, no color)
export const PATTERNS: Record<string, string> = {
  grid:
    "url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2748%27 height=%2748%27%3E%3Cpath d=%27M48 0H0V48%27 fill=%27none%27 stroke=%27%23ffffff%27 stroke-opacity=%270.06%27/%3E%3C/svg%3E')",
  dots:
    "url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%271.2%27 fill=%27%23ffffff%27 fill-opacity=%270.09%27/%3E%3C/svg%3E')",
  diag:
    "url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27%3E%3Cpath d=%27M0 24L24 0M-6 30L30 -6M6 30L30 6%27 stroke=%27%23ffffff%27 stroke-opacity=%270.06%27/%3E%3C/svg%3E')",
  cross:
    "url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27%3E%3Cpath d=%27M20 0V40M0 20H40%27 stroke=%27%23ffffff%27 stroke-opacity=%270.06%27/%3E%3C/svg%3E')",
};

export function getCasoVisual(slug: string): CasoVisual & { patternUrl: string } {
  const v = VISUALS[slug] ?? VISUALS["fie-inteligencia-educativa"];
  return { ...v, patternUrl: PATTERNS[v.pattern] ?? PATTERNS.grid };
}
