/**
 * Author profile — centralized for E-E-A-T consistency
 *
 * Used in:
 * - BaseLayout.astro (Person schema)
 * - Blog posts (frontmatter + Article schema)
 * - Blog template (author card + bio)
 */

export const author = {
  name: "Matías Pérez Nauto",
  shortName: "Matías Pérez",
  role: "Fundador & Estratega Digital",
  company: "Mtsprz Soluciones Digitales",
  bio: "Especialista en SEO local, desarrollo web moderno y automatización de procesos para pymes en la Región de Los Lagos, Chile. +50 proyectos entregados. Enfoque práctico: resultados medibles, no promesas vacías.",
  credentials: [
    "SEO Local & Google Business Profile",
    "Desarrollo Web Astro / Stack Moderno",
    "Automatización de Procesos (n8n, WhatsApp API)",
    "Marketing Digital para Pymes",
  ],
  location: "Puerto Varas, Región de Los Lagos, Chile",
  email: "contacto@mtsprz.org",
  phone: "+56966929818",
  sameAs: [
    "https://www.linkedin.com/in/matiaspereznauto/",
    "https://github.com/mtsprz",
    "https://www.google.com/maps/place/Mtsprz/@-41.3130329,-72.9944674,17z",
  ],
  image: "/logo.jpg",
} as const;
