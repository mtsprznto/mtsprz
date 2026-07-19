#!/usr/bin/env node

/**
 * Optimize Images — convierte imágenes a WebP y AVIF
 *
 * Uso:
 *   node scripts/optimize-images.mjs              # convertir todo
 *   node scripts/optimize-images.mjs --dry-run     # solo mostrar qué se convertirá
 *   node scripts/optimize-images.mjs --quality 80  # calidad (default: 80)
 *
 * Requisitos: sharp-cli instalado como devDependency (ya lo está)
 *
 * Autor: Mtsprz SEO
 * Fecha: 2026-07
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

const QUALITY = parseInt(process.argv.find((a) => a.startsWith("--quality="))?.split("=")[1] || "80", 10);
const DRY_RUN = process.argv.includes("--dry-run");

const IMAGES = [
  { src: "portafolio/blast-landing.png" },
  { src: "portafolio/blast-dashboard.png" },
  { src: "portafolio/novablast-landing.png" },
  { src: "portafolio/novablast-simulador.png" },
  { src: "logo.jpg" },
  { src: "logo_v1.png" },
];

const SHARP_BIN = path.join(ROOT, "node_modules", ".bin", "sharp");

function getSize(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return (stat.size / 1024).toFixed(1) + " KB";
  } catch {
    return "N/A";
  }
}

function convert(srcPath, destPath) {
  const srcSize = getSize(srcPath);
  const sharp = `"${SHARP_BIN}"`;
  const cmd = `${sharp} -i "${srcPath}" -o "${destPath}" --quality ${QUALITY}`;
  console.log(`     ${cmd}`);
  execSync(cmd, { stdio: "pipe", cwd: ROOT, timeout: 60000 });
  const newSize = getSize(destPath);
  const srcKB = parseFloat(srcSize);
  const newKB = parseFloat(newSize);
  const saved = srcKB > 0 ? ((srcKB - newKB) / srcKB * 100).toFixed(0) : "?";
  console.log(`     ✅ ${path.basename(destPath)} (${newSize}) — ahorro ${saved}%`);
}

console.log("=".repeat(60));
console.log("  Mtsprz — Image Optimizer");
console.log(`  Quality: ${QUALITY}`);
console.log(`  Dry run: ${DRY_RUN ? "YES" : "NO"}`);
console.log("=".repeat(60));

for (const img of IMAGES) {
  const srcPath = path.join(PUBLIC, img.src);
  if (!fs.existsSync(srcPath)) {
    console.log(`\n  ⚠️  NOT FOUND: ${img.src}`);
    continue;
  }

  const parsed = path.parse(srcPath);
  const webpPath = path.join(parsed.dir, parsed.name + ".webp");
  const avifPath = path.join(parsed.dir, parsed.name + ".avif");
  const srcSize = getSize(srcPath);

  console.log(`\n  📷 ${img.src} (${srcSize})`);

  if (!fs.existsSync(webpPath)) {
    if (DRY_RUN) {
      console.log(`     ⏳ → ${parsed.name}.webp`);
    } else {
      try { convert(srcPath, webpPath); } catch (e) { console.error(`     ❌ WebP: ${e.message.split('\n')[0]}`); }
    }
  } else {
    console.log(`     ✅ ${parsed.name}.webp ya existe (${getSize(webpPath)})`);
  }

  if (!fs.existsSync(avifPath)) {
    if (DRY_RUN) {
      console.log(`     ⏳ → ${parsed.name}.avif`);
    } else {
      try { convert(srcPath, avifPath); } catch (e) { console.error(`     ❌ AVIF: ${e.message.split('\n')[0]}`); }
    }
  } else {
    console.log(`     ✅ ${parsed.name}.avif ya existe (${getSize(avifPath)})`);
  }
}

console.log("\n" + "=".repeat(60));
console.log("  ¡Listo!");
console.log("  Si se crearon archivos .webp o .avif, actualiza los <img> a <picture>");
console.log("=".repeat(60));
