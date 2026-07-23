/**
 * Mapeo de categorías DB → display público.
 * Solo datos de presentación — NO precios, deliverables, etc.
 *
 * Cada categoría tiene un fondo editorial único generado por `getEditorialBg`.
 * Los gradientes son cinematográficos, oscuros y texturizados — simulan
 * sesiones fotográficas de estudio con iluminación dramática.
 */
export const categoryDisplay: Record<
  string,
  { icon: string; accent: string; slug: string; tags: string[]; landingUrl?: string }
> = {
  "Desarrollo Web": {
    icon: "Code",
    accent: "#6366f1",
    slug: "desarrollo-web",
    tags: ["Landing Pages", "Sitios Web", "E-commerce", "Apps Web"],
    landingUrl: "/desarrollo-web",
  },
  "Automatización de Procesos": {
    icon: "Bot",
    accent: "#06b6d4",
    slug: "automatizaciones",
    tags: ["WhatsApp Bots", "Excel", "CRM", "Workflows"],
    landingUrl: "/automatizacion",
  },
  "Datos e Inteligencia": {
    icon: "BarChart3",
    accent: "#f97316",
    slug: "datos",
    tags: ["Dashboards", "Scraping", "APIs", "OCR"],
  },
  SEO: {
    icon: "Search",
    accent: "#10b981",
    slug: "seo",
    tags: ["SEO Local", "Google Maps", "Auditoría", "Contenido"],
    landingUrl: "/seo-local",
  },
  "Marketing Digital": {
    icon: "TrendingUp",
    accent: "#f59e0b",
    slug: "marketing-digital",
    tags: ["Google Ads", "Redes Sociales", "Contenido", "Analítica"],
  },
  "Diseño Gráfico": {
    icon: "Palette",
    accent: "#ec4899",
    slug: "diseno-grafico",
    tags: ["Logos", "Identidad", "Marca", "UX/UI"],
  },
  Consultoría: {
    icon: "Globe",
    accent: "#8b5cf6",
    slug: "consultoria",
    tags: ["Diagnóstico", "Plan", "Pymes", "Estrategia"],
  },
};

export const DEFAULT_CATEGORY = "Consultoría";

/**
 * Genera fondo editorial cinematográfico único por categoría.
 * Cada fondo combina:
 * - Un gradiente base oscuro de fondo (dominante)
 * - Un foco de luz radial inspirado en iluminación Rembrandt/estudio
 * - Un gradiente lineal inferior para transición suave al overlay de texto
 *
 * Uso: inline CSS en `background` property.
 */
export function getEditorialBg(accent: string, index: number): string {
  const lightAngle = index % 2 === 0 ? "70% 30%" : "30% 70%";
  const secondaryLight = index % 3 === 0 ? "80% 90%" : "20% 10%";
  return `
    radial-gradient(ellipse at ${lightAngle}, ${accent}22 0%, transparent 60%),
    radial-gradient(ellipse at ${secondaryLight}, ${accent}0d 0%, transparent 50%),
    linear-gradient(170deg, #0A0A0A 0%, ${accent}06 35%, #0A0A0A 100%)
  `;
}

/**
 * Fondo para hover — intensifica la iluminación.
 */
export function getEditorialBgHover(accent: string, index: number): string {
  const lightAngle = index % 2 === 0 ? "70% 30%" : "30% 70%";
  return `
    radial-gradient(ellipse at ${lightAngle}, ${accent}44 0%, transparent 60%),
    radial-gradient(ellipse at 50% 90%, ${accent}1a 0%, transparent 50%),
    linear-gradient(170deg, #0A0A0A 0%, ${accent}0d 35%, #0A0A0A 100%)
  `;
}

export interface ServiceDisplay {
  icon: string;
  title: string;
  description: string;
  tags: string[];
  accent: string;
  slug: string;
  landingUrl?: string;
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
  };
}
