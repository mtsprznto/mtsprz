#!/usr/bin/env node

/**
 * IndexNow Notify — notifica a Bing (y otros motores compatibles) cada cambio de URL
 * en tiempo real. Es la base para que Copilot y ChatGPT citen contenido fresco.
 *
 * Uso (desde Windows, DESPUÉS de desplegar el build):
 *   node scripts/indexnow-notify.mjs
 *   node scripts/indexnow-notify.mjs --url=https://mtsprz.org/blog/mi-post   (URL única)
 *
 * Key file: /public/6bd0ca88-d854-4880-8696-0487e438a7b4.txt (ya existe)
 * Protocolo: https://www.indexnow.org
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SITE = "https://mtsprz.org";
const KEY = "6bd0ca88-d854-4880-8696-0487e438a7b4";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const urlArg = process.argv.find((a) => a.startsWith("--url="));
const SITEMAP = path.join(ROOT, "dist", "sitemap-index.xml");

function extractUrlsFromSitemap(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠ No sitemap en dist: ${filePath}`);
    console.warn("  Ejecuta primero: pnpm build (genera dist/)");
    return [];
  }
  const xml = fs.readFileSync(filePath, "utf-8");
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  // IndexNow acepta hasta 10.000 URLs por batch
  return urls.filter((u) => u.startsWith(SITE)).slice(0, 10000);
}

async function notify(urls) {
  if (!urls.length) {
    console.log("Sin URLs para notificar.");
    return;
  }
  const payload = {
    host: "mtsprz.org",
    key: KEY,
    keyLocation: `${SITE}/${KEY}.txt`,
    urlList: urls,
  };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    console.log(`IndexNow HTTP ${res.status}: ${urls.length} URLs`);
    if (!res.ok) {
      const body = await res.text();
      console.warn(`  Respuesta: ${body.slice(0, 300)}`);
    } else {
      console.log("  ✅ Notificación enviada. Bing crawlea en 24h-3 días.");
    }
  } catch (e) {
    console.error("Error conectando a IndexNow:", e.message);
  }
}

// ── Main ──
if (urlArg) {
  notify([urlArg]);
} else {
  const urls = extractUrlsFromSitemap(SITEMAP);
  notify(urls);
}
