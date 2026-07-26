/**
 * generate-image-sitemap.mjs
 * Generates image-sitemap.xml at build time from blog posts + static pages.
 * Run via: node scripts/generate-image-sitemap.mjs
 */
import fs from "node:fs";
import path from "node:path";

const SITE = "https://mtsprz.org";
const BLOG_DIR = path.resolve("src/content/blog");
const OUTPUT = path.resolve("public/image-sitemap.xml");

function getBlogPosts() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, f), "utf-8");
      const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!frontmatterMatch) return null;

      const fm = frontmatterMatch[1];
      const titleMatch = fm.match(/^title:\s*["']?(.+?)["']?\s*$/m);
      const imageMatch = fm.match(/^image:\s*["']?(.+?)["']?\s*$/m);

      const slug = f.replace(/\.(md|mdx)$/, "");
      const image = imageMatch ? imageMatch[1] : "/logo.jpg";
      const imageUrl = image.startsWith("http") ? image : `${SITE}${image}`;

      return {
        loc: `${SITE}/blog/${slug}`,
        images: [imageUrl],
      };
    })
    .filter(Boolean);
}

function buildImageSitemap() {
  const posts = getBlogPosts();

  const urls = [
    // Home
    {
      loc: SITE,
      images: [`${SITE}/seo/16_9.png`],
    },
    // Blog posts
    ...posts,
    // Static pages — use real images where available
    { loc: `${SITE}/contacto`, images: [`${SITE}/seo/16_9_equipo.png`] },
    { loc: `${SITE}/servicios`, images: [`${SITE}/seo/16_9_escritorio.png`] },
    { loc: `${SITE}/nosotros`, images: [`${SITE}/seo/4_4_equipo.png`] },
    { loc: `${SITE}/portafolio`, images: [`${SITE}/portafolio/blast-landing.png`] },
    { loc: `${SITE}/desarrollo-web`, images: [`${SITE}/seo/16_9_escritorio.png`] },
    { loc: `${SITE}/seo-local`, images: [`${SITE}/seo/16_9.png`] },
    { loc: `${SITE}/automatizacion`, images: [`${SITE}/seo/16_9_espacio_min.png`] },
    // Regiones
    { loc: `${SITE}/regiones/puerto-varas`, images: [`${SITE}/seo/16_9.png`] },
    { loc: `${SITE}/regiones/osorno`, images: [`${SITE}/seo/16_9.png`] },
    { loc: `${SITE}/regiones/valdivia`, images: [`${SITE}/seo/16_9.png`] },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
${u.images
  .map(
    (img) => `    <image:image>
      <image:loc>${img}</image:loc>
    </image:image>`
  )
  .join("\n")}
  </url>`
  )
  .join("\n")}
</urlset>`;

  fs.writeFileSync(OUTPUT, xml, "utf-8");
  console.log(`✅ image-sitemap.xml generated with ${urls.length} URLs`);
}

buildImageSitemap();
