import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://mtsprz.org",
  integrations: [mdx(), sitemap()],
  output: "server",
  adapter: vercel({
    isr: {
      expiration: 60,
    },
  }),
  vite: {
    plugins: [tailwindcss()],
  },
});
