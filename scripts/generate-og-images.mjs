#!/usr/bin/env node

/**
 * Generate OG Images — crea imágenes OG (1200×630) para los posts del blog
 * y para las páginas clave del sitio.
 *
 * Modo posts (default): lee src/content/blog/*.md, genera el PNG canónico
 * public/blog/og-<slug>.png vía sharp (1200×630), sincroniza el `image:` del
 * frontmatter y elimina assets sin referencias (solo modo full, sin --post).
 * Fallback SVG si sharp no está instalado.
 * Modo páginas (--pages): genera PNG en public/og/<slug>.png vía sharp
 * (devDependency) para las 10 páginas clave definidas en PAGES.
 *
 * Uso (desde Windows para PNGs):
 *   node scripts/generate-og-images.mjs          # posts → public/blog/
 *   node scripts/generate-og-images.mjs --pages  # páginas → public/og/
 *   node scripts/generate-og-images.mjs --dry-run
 *   node scripts/generate-og-images.mjs --force  # regenera aunque existan
 *   node scripts/generate-og-images.mjs --post=slug
 *
 * Requisitos: sharp (devDependency). Sin sharp se escribe SVG y se avisa.
 *
 * Autor: Mtsprz SEO
 * Fecha: 2026-08 (ronda 2: --pages · ronda 2.5: posts→PNG canónico + limpieza)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const BLOG_DIR = path.join(PUBLIC, "blog");
const CONTENT_DIR = path.join(ROOT, "src", "content", "blog");

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const PAGES_MODE = process.argv.includes("--pages");
const postArg = process.argv.find((a) => a.startsWith("--post="));
const ONLY_POST = postArg ? postArg.split("=")[1] : null;

/**
 * Páginas clave para OG estática (modo --pages) → public/og/<slug>.png.
 * Título/eyebrow alineados al contenido real de cada página (sin claims nuevos).
 */
const PAGES = [
  { slug: "home", title: "Soluciones digitales que no se caen", eyebrow: "DESARROLLO WEB · SEO LOCAL · AUTOMATIZACIÓN", accent: "#6366f1" },
  { slug: "servicios", title: "Servicios digitales para pymes", eyebrow: "WEB · SEO LOCAL · AUTOMATIZACIÓN", accent: "#6366f1" },
  { slug: "desarrollo-web", title: "Desarrollo web profesional", eyebrow: "SITIOS RÁPIDOS · SEO TÉCNICO · ASTRO", accent: "#6366f1" },
  { slug: "seo-local", title: "SEO local en Google Maps", eyebrow: "POSICIONAMIENTO LOCAL · LOS LAGOS", accent: "#10b981" },
  { slug: "automatizacion", title: "Automatización para pymes", eyebrow: "BOTS WHATSAPP · CRM · DASHBOARDS", accent: "#f59e0b" },
  { slug: "contacto", title: "Hablemos de tu proyecto", eyebrow: "PUERTO VARAS · REGIÓN DE LOS LAGOS", accent: "#6366f1" },
  { slug: "casos", title: "Casos de automatización con IA", eyebrow: "PROYECTOS REALES · REGIÓN DE LOS LAGOS", accent: "#8b5cf6" },
  { slug: "puerto-varas", title: "Agencia digital en Puerto Varas", eyebrow: "WEB · SEO LOCAL · WHATSAPP", accent: "#10b981" },
  { slug: "osorno", title: "Agencia digital en Osorno", eyebrow: "WEB · SEO LOCAL · WHATSAPP", accent: "#10b981" },
  { slug: "puerto-montt", title: "Agencia digital en Puerto Montt", eyebrow: "WEB · SEO LOCAL · AUTOMATIZACIÓN", accent: "#10b981" },
];

/** Accent por keyword del título — mantiene coherencia con el design system. */
function pickAccent(title, slug) {
  const t = `${slug} ${title}`.toLowerCase();
  if (/seo|maps|posicion/.test(t)) return "#10b981"; // emerald
  if (/whatsapp|waba|chat/.test(t)) return "#06b6d4"; // cyan
  if (/marketing|ads|instagram|tiktok|linkedin|redes|publicidad/.test(t)) return "#8b5cf6"; // violet
  if (/ia|ai|chatgpt|agente|automat/.test(t)) return "#f59e0b"; // amber
  if (/precio|cuesta|crm|geo/.test(t)) return "#6366f1"; // indigo
  return "#6366f1";
}

/**
 * Lee todos los posts del blog: slug (nombre archivo) + title + image.
 * Naming canónico: `og-<slug>.png` — auto-reparable, sin OG compartidas
 * (cada post tiene su propia imagen aunque hoy comparta el mismo asset).
 */
function readPosts() {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
      const title = raw.match(/^title:\s*["']?(.*?)["']?\s*$/m)?.[1] || file.replace(/\.md$/, "");
      const image = raw.match(/^image:\s*["']?(.*?)["']?\s*$/m)?.[1] || "";
      const slug = file.replace(/\.md$/, "");
      return {
        slug,
        title,
        image,
        imageName: `og-${slug}.png`,
        accent: pickAccent(title, file),
      };
    });
}

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
  <text x="80" y="190" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="16" fill="white" opacity="0.4" letter-spacing="1">${escapeXml(post.eyebrow || "SOLUCIONES DIGITALES · REGIÓN DE LOS LAGOS · CHILE")}</text>
  ${titleSpans}
  <rect x="0" y="590" width="1200" height="40" fill="${post.accent}" opacity="0.08"/>
  <text x="80" y="615" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="13" fill="white" opacity="0.3">mtsprz.org · Soluciones Digitales · Región de Los Lagos, Chile</text>
</svg>`;
}

async function generatePost(post, sharp) {
  const svg = generateSVG(post);
  const pngPath = path.join(BLOG_DIR, post.imageName);
  const svgPath = pngPath.replace(/\.png$/, ".svg");

  if (DRY_RUN) {
    console.log(`[dry-run] ${post.slug} → ${post.imageName}`);
    return `/blog/${post.imageName}`;
  }

  if (sharp) {
    // PNG canónico 1200×630 (density 144 → render 2× y resize: texto nítido).
    if (FORCE || !fs.existsSync(pngPath)) {
      const buf = await sharp(Buffer.from(svg), { density: 144 })
        .resize(1200, 630)
        .png({ compressionLevel: 9 })
        .toBuffer();
      fs.writeFileSync(pngPath, buf);
      const kb = Math.round(buf.length / 1024);
      console.log(`✓ ${post.imageName} (${kb} KB)${kb > 300 ? "  ⚠ >300 KB" : ""}`);
    } else {
      console.log(`· ${post.imageName} (ya existe)`);
    }
    patchFrontmatterImage(post.slug, `/blog/${post.imageName}`);
    return `/blog/${post.imageName}`;
  }

  // Fallback sin sharp: SVG (se regenera siempre; barato) + frontmatter al .svg.
  fs.writeFileSync(svgPath, svg, "utf-8");
  const svgName = path.basename(svgPath);
  console.log(`~ ${svgName} (sharp no instalado)`);
  patchFrontmatterImage(post.slug, `/blog/${svgName}`);
  return `/blog/${svgName}`;
}

/** Genera la OG de una página clave en public/og/ (PNG vía sharp; SVG si falta). */
async function generatePage(page, sharp, ogDir) {
  const svg = generateSVG(page);
  const pngPath = path.join(ogDir, `${page.slug}.png`);
  const svgPath = path.join(ogDir, `${page.slug}.svg`);

  if (DRY_RUN) {
    console.log(`[dry-run] page:${page.slug} → og/${page.slug}.png`);
    return;
  }

  if (fs.existsSync(pngPath) && !FORCE) {
    console.log(`· og/${page.slug}.png (ya existe)`);
    return;
  }

  if (!sharp) {
    fs.writeFileSync(svgPath, svg, "utf-8");
    console.log(`~ og/${page.slug}.svg (sharp no instalado)`);
    return;
  }

  try {
    // density 144 → render 2× y resize a 1200×630 (texto nítido).
    const buf = await sharp(Buffer.from(svg), { density: 144 })
      .resize(1200, 630)
      .png({ compressionLevel: 9 })
      .toBuffer();
    fs.writeFileSync(pngPath, buf);
    const kb = Math.round(buf.length / 1024);
    console.log(`✓ og/${page.slug}.png (${kb} KB)${kb > 300 ? "  ⚠ >300 KB" : ""}`);
  } catch (err) {
    fs.writeFileSync(svgPath, svg, "utf-8");
    console.log(`⚠ sharp falló en ${page.slug} (${err.message}) → og/${page.slug}.svg`);
  }
}

/** Reemplaza la línea `image:` del frontmatter de un post. */
function patchFrontmatterImage(slug, newImage) {
  const file = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return;
  let raw = fs.readFileSync(file, "utf-8");
  const updated = raw.replace(/^image:\s*.*$/m, `image: "${newImage}"`);
  if (updated !== raw) {
    fs.writeFileSync(file, updated, "utf-8");
    console.log(`   frontmatter → ${newImage}`);
  }
}

/**
 * Elimina de public/blog los assets OG que ya no referencia ningún post
 * (SVG viejos, PNG huérfanos, OG compartidas reemplazadas). Solo se invoca
 * en modo full (sin --post); con --dry-run solo previsualiza.
 */
function cleanStaleAssets(usedRefs, dryRun = false) {
  const used = new Set(usedRefs.map((r) => path.basename(r)));
  let stale = 0;
  for (const f of fs.readdirSync(BLOG_DIR)) {
    if (used.has(f)) continue;
    stale++;
    if (dryRun) {
      console.log(`[dry-run] - ${f} (sin referencias)`);
    } else {
      fs.unlinkSync(path.join(BLOG_DIR, f));
      console.log(`- ${f} (sin referencias)`);
    }
  }
  console.log(
    stale
      ? `  ${stale} assets ${dryRun ? "se eliminarían" : "obsoletos eliminados"}`
      : "  sin assets obsoletos",
  );
}

// ── Main ──
if (PAGES_MODE) {
  // ── Modo páginas clave → public/og/<slug>.png (1200×630) ──
  const OG_DIR = path.join(PUBLIC, "og");
  if (!DRY_RUN && !fs.existsSync(OG_DIR)) {
    fs.mkdirSync(OG_DIR, { recursive: true });
  }

  let sharp = null;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.log("⚠ sharp no instalado — fallback a SVG (las páginas referencian .png; correr tras instalar deps en Windows).\n");
  }

  console.log(`\nGenerando OG images para ${PAGES.length} páginas clave...\n`);
  for (const page of PAGES) {
    await generatePage(page, sharp, OG_DIR);
  }
  console.log(`\n✓ Done`);
} else {
  // ── Modo posts → public/blog/og-<slug>.png (PNG vía sharp) ──
  if (!fs.existsSync(BLOG_DIR)) {
    fs.mkdirSync(BLOG_DIR, { recursive: true });
  }

  let sharp = null;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.log("⚠ sharp no instalado — fallback a SVG (correr desde Windows con deps instaladas).\n");
  }

  let posts = readPosts();
  posts = ONLY_POST
    ? posts.filter((p) => p.slug.includes(ONLY_POST) || p.image.includes(ONLY_POST))
    : posts;

  console.log(`\nGenerando OG images para ${posts.length} posts...\n`);

  const usedRefs = [];
  for (const post of posts) {
    usedRefs.push(await generatePost(post, sharp));
  }

  // Limpieza de assets sin referencias: solo en modo full (no con --post).
  if (!ONLY_POST) {
    console.log("");
    cleanStaleAssets(usedRefs, DRY_RUN);
  }

  console.log(`\n✓ Done`);
  if (!sharp) {
    console.log(`  Para PNGs reales: pnpm install && node scripts/generate-og-images.mjs (en Windows)`);
  }
}
