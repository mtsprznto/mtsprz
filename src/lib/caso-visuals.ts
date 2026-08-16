/**
 * caso-visuals.ts · Visuales compartidos para casos de estudio.
 * Única fuente de verdad para gradientes (fallback), patrones SVG y la
 * captura real de cada proyecto (proof of work: screenshot real, no fake).
 * Se usa en: CasoCard (showcase), TestimoniosReservados (butacas),
 * [slug].astro (hero cinematográfico).
 * La "imagen" es la tarjeta: captura real del producto + gradiente de marca
 * como base mientras carga. J1 se mantiene: nada de fotos fake ni stock —
 * son screenshots auténticos del trabajo (norte humanista: oficio real).
 */

export interface CasoVisual {
  bg: string;
  pattern: string;
  /** Captura real del proyecto (png; avif/webp se derivan en el componente). */
  image: string;
}

// Gradientes monocromáticos indigo/violeta/azul, consistentes con la marca,
// aclarados para leerse sobre #0A0A0A (brillo → media → noche).
// Actúan como base/fallback bajo la captura real mientras carga.
export const VISUALS: Record<string, CasoVisual> = {
  "fie-inteligencia-educativa": {
    bg: "radial-gradient(130% 130% at 85% 0%, #6366f1 0%, #312e81 45%, #020617 100%)",
    pattern: "grid",
    image: "/portafolio/fie-landing.png",
  },
  "blastup-email-ia": {
    bg: "radial-gradient(130% 130% at 15% 0%, #a78bfa 0%, #4c1d95 45%, #020617 100%)",
    pattern: "dots",
    image: "/portafolio/blast-landing.png",
  },
  "gestorpass-gestor-password": {
    bg: "radial-gradient(130% 130% at 60% 100%, #0ea5e9 0%, #0c4a6e 45%, #020617 100%)",
    pattern: "diag",
    image: "/portafolio/gestpass-login.png",
  },
  "novablast-ia": {
    bg: "radial-gradient(130% 130% at 30% 30%, #34d399 0%, #065f46 50%, #020617 100%)",
    pattern: "cross",
    image: "/portafolio/novablast-landing.png",
  },
};

// Patrones SVG inline (blanco translúcido · textura, no color)
export const PATTERNS: Record<string, string> = {
  grid:
    "url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2748%27 height=%2748%27%3E%3Cpath d=%27M48 0H0V48%27 fill=%27none%27 stroke=%27%23ffffff%27 stroke-opacity=%270.14%27/%3E%3C/svg%3E')",
  dots:
    "url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%271.2%27 fill=%27%23ffffff%27 fill-opacity=%270.15%27/%3E%3C/svg%3E')",
  diag:
    "url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27%3E%3Cpath d=%27M0 24L24 0M-6 30L30 -6M6 30L30 6%27 stroke=%27%23ffffff%27 stroke-opacity=%270.14%27/%3E%3C/svg%3E')",
  cross:
    "url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27%3E%3Cpath d=%27M20 0V40M0 20H40%27 stroke=%27%23ffffff%27 stroke-opacity=%270.14%27/%3E%3C/svg%3E')",
};

export function getCasoVisual(slug: string): CasoVisual & { patternUrl: string } {
  const v = VISUALS[slug] ?? VISUALS["fie-inteligencia-educativa"];
  return { ...v, patternUrl: PATTERNS[v.pattern] ?? PATTERNS.grid };
}
