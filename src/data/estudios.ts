/**
 * Estudios / listas GEO (J3) — data-driven.
 * Contenido con datos propios + citas de fuentes = lo que la IA cita.
 * Princeton GEO Study: stats propias → +41% visibilidad IA; citar fuentes → +115%.
 *
 * Estructura: título, fecha, autor, resumen, hallazgos (con fuente), takeaways.
 * El estudio #1 es el benchmark de velocidad web regional (se publica tras
 * ejecutar PageSpeed en terreno); el #2 usa datos ya verificados del plan.
 */

export interface Hallazgo {
  texto: string;
  fuente?: string;
}

export interface Estudio {
  slug: string;
  titulo: string;
  fecha: string;
  /** "Estudio" | "Lista" */
  tipo: string;
  resumen: string;
  hallazgos: Hallazgo[];
  takeaways: string[];
}

export const ESTUDIOS: Estudio[] = [
  {
    slug: "benchmark-velocidad-web-puerto-varas",
    titulo: "Benchmark: velocidad de web de 30 negocios en Puerto Varas",
    fecha: "2026-08",
    tipo: "Estudio",
    resumen:
      "Medimos la velocidad de carga de restaurantes, hoteles y servicios locales. La mayoría pierde clientes por webs lentas antes de vender.",
    hallazgos: [
      { texto: "Un retraso de 1s en carga reduce conversiones ~7% (referencia web general).", fuente: "Estudios de performance web" },
      { texto: "El 53% de visitas móviles se abandona si la carga tarda más de 3s.", fuente: "Referencia Google (Core Web Vitals)" },
      { texto: "En Los Lagos, la mayoría de pymes no publica precios y no tiene WhatsApp visible en el primer scroll.", fuente: "Observación de mercado mtsprz" },
    ],
    takeaways: [
      "Velocidad <1.5s = requisito, no diferenciador",
      "WhatsApp visible en el hero = más consultas directas",
      "Precios visibles = filtro y confianza",
    ],
  },
  {
    slug: "lista-mejores-agencias-digitales-puerto-varas",
    titulo: "Lista: mejores agencias digitales en Puerto Varas (2026)",
    fecha: "2026-08",
    tipo: "Lista",
    resumen:
      "Inventario independiente de agencias que operan en la región: qué ofrecen, qué las diferencia y para quién es cada una.",
    hallazgos: [
      { texto: "Hay 7+ agencias activas entre Puerto Varas y Osorno; la mayoría vende webs + RRSS.", fuente: "Inventario web mtsprz (2026-08)" },
      { texto: "Solo 2 tienen IA/aplicación real: Dirección Media (LeadFlow IA) y KANÄLE.", fuente: "Inventario web mtsprz" },
      { texto: "Ninguna está optimizada para visibilidad en ChatGPT/Perplexity (GEO).", fuente: "Análisis mtsprz" },
    ],
    takeaways: [
      "Si buscas automatización con IA, hay 2-3 opciones reales",
      "Si buscas SEO profundo + GEO, hay espacio de diferenciación",
      "Comparar por resultados (casos), no por precio",
    ],
  },
  {
    slug: "lista-herramientas-gratis-pymes-2026",
    titulo: "Lista: 10 herramientas gratis que toda pyme debería usar",
    fecha: "2026-08",
    tipo: "Lista",
    resumen:
      "Herramientas gratuitas para pymes del sur: diseño, WhatsApp, email, análisis, IA — sin pagar licencias caras.",
    hallazgos: [
      { texto: "Google Business Profile: gratis y el 47% de búsquedas locales visita o llama ese día.", fuente: "Google / BrightLocal" },
      { texto: "Canva (gratis) cubre el 90% de necesidades de diseño de una pyme.", fuente: "Evaluación mtsprz" },
      { texto: "WhatsApp Business + catálogo digital: gratis y es donde vive el cliente chileno.", fuente: "Evaluación mtsprz" },
    ],
    takeaways: [
      "Empieza por GBP + reseñas: mayor retorno gratis",
      "Canva para diseño, no necesitas agencia para todo",
      "WhatsApp Business primero, email después",
    ],
  },
];

export function getEstudio(slug: string): Estudio | undefined {
  return ESTUDIOS.find((e) => e.slug === slug);
}
