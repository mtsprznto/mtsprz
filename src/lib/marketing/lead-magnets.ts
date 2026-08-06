/**
 * Marketing · Catálogo de lead magnets (J4 del plan 2026).
 * Contenido público (SEO/GEO) + captura de email → secuencia.
 *
 * Los "magnets" NO son archivos PDF: son páginas públicas en /recursos/[slug]
 * (mejor para GEO: contenido indexable y citable). El email de descarga
 * entrega resumen + CTA diagnóstico, y dispara la secuencia de nurturing.
 */

export interface LeadMagnet {
  id: string;
  slug: string;
  /** Nombre visible en cards y emails */
  title: string;
  /** Promesa de 1 línea · copy de la card */
  promise: string;
  /** Para quién (buyer persona) */
  audience: string;
  /** Resultado concreto que promete */
  outcome: string;
  /** Icono lucide (nombre del icono) */
  icon: string;
  /** Orden en la página de recursos */
  order: number;
}

export const LEAD_MAGNETS: LeadMagnet[] = [
  {
    id: "checklist-web-2026",
    slug: "checklist-web-2026",
    title: "Checklist: tu web lista para 2026",
    promise: "8 puntos para que tu web no te robe clientes",
    audience: "Hoteles, restaurantes y servicios del sur",
    outcome: "Detecta por qué pierdes visitas y qué arreglar primero (velocidad, WhatsApp, precios, reseñas).",
    icon: "list-checks",
    order: 1,
  },
  {
    id: "automatizaciones-pyme",
    slug: "10-automatizaciones-pyme",
    title: "10 automatizaciones que toda pyme debería tener",
    promise: "WhatsApp que responde, reservas automáticas, boletas sin fricción",
    audience: "Servicios profesionales y proveedores B2B",
    outcome: "Mira qué procesos se pueden automatizar hoy con IA y WhatsApp · sin contratar a nadie.",
    icon: "bot",
    order: 2,
  },
  {
    id: "guia-google-maps",
    slug: "guia-google-maps-2026",
    title: "Guía Google Maps 2026",
    promise: "Cómo aparecer cuando buscan tu negocio en la zona",
    audience: "Negocios locales de Los Lagos y Los Ríos",
    outcome: "Ficha optimizada paso a paso: fotos, categorías, reseñas, preguntas. El 76% que busca un negocio local lo visita dentro de 24 horas.",
    icon: "map-pin",
    order: 3,
  },
];

export function getLeadMagnet(id: string): LeadMagnet | undefined {
  return LEAD_MAGNETS.find((m) => m.id === id || m.slug === id);
}

export function getLeadMagnetBySlug(slug: string): LeadMagnet | undefined {
  return LEAD_MAGNETS.find((m) => m.slug === slug);
}
