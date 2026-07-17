import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://solucionesdigitalessur.cl",
  integrations: [mdx(), sitemap()],
  output: "static",
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});
