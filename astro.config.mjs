import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://mtsprz.org",
  trailingSlash: "never",
  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        !page.includes("/admin") &&
        !page.includes("/login") &&
        !page.includes("/registro") &&
        !page.includes("/contratos") &&
        !page.includes("/buscar") &&
        !page.includes("/cotizar") &&
        !page.includes("/firmar"),
    }),
  ],
  output: "server",
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});
