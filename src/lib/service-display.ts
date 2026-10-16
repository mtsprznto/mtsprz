/**
 * Mapeo de categorías DB → display público.
 * Solo datos de presentación · NO precios, deliverables, etc.
 *
 * Acentos por categoría/rol según §2.3 (se conserva el rol, no el hex):
 * uso puntual (icono, dot, línea activa) — nunca como texto pequeño.
 */
export const categoryDisplay: Record<
  string,
  { icon: string; accent: string; slug: string; tags: string[]; landingUrl?: string }
> = {
  "Desarrollo Web": {
    icon: "Code",
    accent: "#00FF66",
    slug: "desarrollo-web",
    tags: ["Landing Pages", "Sitios Web", "E-commerce", "Apps Web"],
    landingUrl: "/desarrollo-web",
  },
  "Automatización de Procesos": {
    icon: "Bot",
    accent: "#22D3EE",
    slug: "automatizaciones",
    tags: ["WhatsApp Bots", "Excel", "CRM", "Workflows"],
    landingUrl: "/automatizacion",
  },
  "Datos e Inteligencia": {
    icon: "BarChart3",
    accent: "#A855F7",
    slug: "datos",
    tags: ["Dashboards", "Scraping", "APIs", "OCR"],
  },
  SEO: {
    icon: "Search",
    accent: "#22E584",
    slug: "seo",
    tags: ["SEO Local", "Google Maps", "Auditoría", "Contenido"],
    landingUrl: "/seo-local",
  },
  "Marketing Digital": {
    icon: "TrendingUp",
    accent: "#EAB308",
    slug: "marketing-digital",
    tags: ["Google Ads", "Redes Sociales", "Contenido", "Analítica"],
  },
  "Diseño Gráfico": {
    icon: "Palette",
    accent: "#C084FC",
    slug: "diseno-grafico",
    tags: ["Logos", "Identidad", "Marca", "UX/UI"],
  },
  Consultoría: {
    icon: "Globe",
    accent: "#FF3366",
    slug: "consultoria",
    tags: ["Diagnóstico", "Plan", "Pymes", "Estrategia"],
  },
};

export const DEFAULT_CATEGORY = "Consultoría";

/**
 * Capacidades/stack honesto por línea de servicio (§6.4 capa técnica).
 * Fuente única para home + /servicios.
 */
export const serviceStack: Record<string, string[]> = {
  "desarrollo-web": ["Astro", "TypeScript", "Tailwind CSS", "Core Web Vitals"],
  seo: [
    "SEO técnico on-page",
    "Schema.org",
    "Google Business Profile",
    "Search Console",
  ],
  automatizaciones: ["TypeScript", "APIs REST", "WhatsApp (WAHA)", "Schedulers / cron"],
  datos: ["PostgreSQL", "SQL", "Scraping", "Dashboards"],
  "marketing-digital": ["Analítica (GA4)", "Contenido", "Campañas", "Tracking"],
  "diseno-grafico": ["Identidad de marca", "UI / UX", "Design tokens", "Prototipos"],
  consultoria: ["Diagnóstico técnico", "Roadmap", "Arquitectura", "Estimación"],
};

export interface ServiceDisplay {
  icon: string;
  title: string;
  description: string;
  tags: string[];
  accent: string;
  slug: string;
  landingUrl?: string;
  stack: string[];
}

export function toServiceDisplay(row: {
  name: string;
  description: string | null;
  category: string | null;
  slug: string;
}): ServiceDisplay {
  const cat = row.category || DEFAULT_CATEGORY;
  const cfg = categoryDisplay[cat] || categoryDisplay[DEFAULT_CATEGORY];
  return {
    icon: cfg.icon,
    title: row.name,
    description: row.description || "",
    tags: cfg.tags,
    accent: cfg.accent,
    slug: cfg.slug,
    landingUrl: cfg.landingUrl,
    stack: serviceStack[cfg.slug] ?? [],
  };
}
