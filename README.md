# Mtsprz | Soluciones Digitales

Landing page profesional para Mtsprz, agencia de soluciones digitales con enfoque en la Región de Los Lagos, Chile. El sitio presenta servicios de desarrollo web, SEO, automatizaciones, diseño gráfico, marketing digital y consultoría para pymes del sur de Chile.

## Stack

Astro 7 con Tailwind CSS 4 para el frontend. Despliegue en Vercel con output estático. El contenido del blog usa MDX con colecciones de Astro. Los formularios de contacto envían correo mediante Resend.

Tipografía con Poppins (headings), Inter (body), Fira Code (mono) y Montserrat (alt). Iconografía con Lucide. Video de fondo alojado en CDN.

## SEO

El layout base incluye JSON-LD estructurado con Organization, LocalBusiness (ubicado en Puerto Varas), WebSite con SearchAction, y BreadcrumbList. Sitemap generado automáticamente con @astrojs/sitemap. Blog con artículos MDX para contenido temático local.

## Proyectos

Dos proyectos destacados en el portafolio: Blast-Up (landing corporativa para ingeniería minera con Next.js y Three.js) y NovaBlast-AI (simulador de fragmentación con WebGPU e IA). Los datos se gestionan desde src/data/projects.json.

## Contacto

Formulario en /contacto que envía a la API de Resend. Sin compromiso, respuesta en 24 hrs.

## Desarrollo

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```
