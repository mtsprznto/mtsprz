#!/usr/bin/env node

/**
 * Generate OG Images — crea PNGs 1200×630 únicos para cada post del blog
 *
 * Uso (desde Windows):
 *   pnpm install                              # instalar @resvg/resvg-js
 *   node scripts/generate-og-images.mjs       # generar todas
 *   node scripts/generate-og-images.mjs --dry-run
 *   node scripts/generate-og-images.mjs --post=slug
 *
 * Output: public/blog/og-{slug}.png
 * Requisitos: @resvg/resvg-js (WASM, cero binarios nativos)
 *
 * Autor: Mtsprz SEO
 * Fecha: 2026-07
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const BLOG_DIR = path.join(PUBLIC, "blog");

const DRY_RUN = process.argv.includes("--dry-run");
const postArg = process.argv.find((a) => a.startsWith("--post="));
const ONLY_POST = postArg ? postArg.split("=")[1] : null;

// ── Posts data ──
const POSTS = [
  { slug: "seo-restaurante-puerto-varas", title: "SEO para restaurantes en Puerto Varas", subtitle: "Guía práctica de SEO local", accent: "#10b981" },
  { slug: "seo-local-pymes-region-los-lagos", title: "SEO local para pymes en la Región de Los Lagos", subtitle: "Posiciona tu negocio en Google Maps", accent: "#10b981" },
  { slug: "paginas-web-rapidas-astro", title: "Páginas web rápidas con Astro", subtitle: "Por qué tu negocio necesita velocidad", accent: "#6366f1" },
  { slug: "guia-seo-pymes-sur-chile", title: "Guía SEO para pymes del sur de Chile", subtitle: "Todo lo que necesitas saber en 2026", accent: "#10b981" },
  { slug: "empresar-google-maps-osorno", title: "Empresarial en Google Maps — Osorno", subtitle: "Guía paso a paso", accent: "#10b981" },
  { slug: "ecommerce-region-los-lagos", title: "E-commerce en la Región de Los Lagos", subtitle: "Vende online desde el sur de Chile", accent: "#8b5cf6" },
  { slug: "cuanto-cuesta-pagina-web-puerto-varas", title: "¿Cuánto cuesta una página web?", subtitle: "Precios en Puerto Varas 2026", accent: "#6366f1" },
  { slug: "como-posicionar-negocio-google-maps-los-lagos", title: "Cómo posicionar tu negocio en Google Maps", subtitle: "Región de Los Lagos", accent: "#10b981" },
  { slug: "como-crear-pagina-web-emprendedores-sur-chile", title: "Cómo crear tu página web", subtitle: "Para emprendedores del sur de Chile", accent: "#6366f1" },
  { slug: "automatizar-whatsapp-negocio-puerto-varas", title: "Automatizar WhatsApp para tu negocio", subtitle: "Puerto Varas & Región de Los Lagos", accent: "#06b6d4" },
  { slug: "automatizar-email-marketing-pymes", title: "Automatizar email marketing para pymes", subtitle: "Guía práctica 2026", accent: "#06b6d4" },
  { slug: "agencia-digital-pymes-osorno", title: "Agencia digital para pymes en Osorno", subtitle: "Soluciones digitales a medida", accent: "#8b5cf6" },
  { slug: "mejor-agencia-marketing-los-lagos", title: "Mejor agencia de marketing en Los Lagos", subtitle: "Guía para elegir bien", accent: "#8b5cf6" },
  { slug: "precios-reales-paginas-web-chile-2026", title: "Precios reales de páginas web en Chile", subtitle: "Actualizado 2026 — datos propios", accent: "#6366f1" },
];

function wrapText(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function generateSVG(post) {
  const titleLines = wrapText(post.title, 28);
  const titleY = titleLines.length === 1 ? 300 : 270;
  const titleSpans = titleLines
    .map((line, i) => `<text x="80" y="${titleY + i * 52}" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="48" fill="white" letter-spacing="-1">${escapeXml(line)}</text>`)
    .join("\n    ");

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#111118"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${post.accent}"/>
      <stop offset="100%" stop-color="${post.accent}88"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="900" cy="200" r="300" fill="${post.accent}" opacity="0.06"/>
  <circle cx="100" cy="500" r="200" fill="${post.accent}" opacity="0.04"/>
  <rect x="80" y="80" width="60" height="3" rx="1.5" fill="url(#accent)"/>
  <text x="80" y="130" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" fill="${post.accent}" letter-spacing="3">MTSPRZ</text>
  <text x="80" y="190" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="16" fill="white" opacity="0.4" letter-spacing="1">${escapeXml(post.subtitle.toUpperCase())}</text>
  ${titleSpans}
  <rect x="0" y="590" width="1200" height="40" fill="${post.accent}" opacity="0.08"/>
  <text x="80" y="615" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="13" fill="white" opacity="0.3">mtsprz.org · Soluciones Digitales · Región de Los Lagos, Chile</text>
</svg>`;
}

async function generatePost(post, resvg) {
  const svg = generateSVG(post);
  const pngPath = path.join(BLOG_DIR, `og-${post.slug}.png`);
  const svgPath = path.join(BLOG_DIR, `og-${post.slug}.svg`);

  if (DRY_RUN) {
    console.log(`[dry-run] Would create: ${pngPath}`);
    return;
  }

  if (resvg) {
    const pngData = resvg.render(svg, 1200, 630);
    fs.writeFileSync(pngPath, pngData);
    console.log(`✓ ${pngPath}`);
  } else {
    // Fallback: save SVG only
    fs.writeFileSync(svgPath, svg, "utf-8");
    console.log(`~ ${svgPath} (SVG — resvg not installed, run: pnpm install)`);
  }
}

// ── Main ──
if (!fs.existsSync(BLOG_DIR)) {
  fs.mkdirSync(BLOG_DIR, { recursive: true });
}

let resvg = null;
try {
  const mod = await import("@resvg/resvg-js");
  resvg = mod;
} catch {
  console.log("⚠ @resvg/resvg-js not installed. Run: pnpm install\n");
}

const posts = ONLY_POST ? POSTS.filter((p) => p.slug.includes(ONLY_POST)) : POSTS;

console.log(`\nGenerating ${posts.length} OG images...\n`);

for (const post of posts) {
  await generatePost(post, resvg);
}

console.log(`\n✓ Done`);
if (!resvg) {
  console.log(`  SVGs generated. For PNGs, run: pnpm install && node scripts/generate-og-images.mjs`);
}
