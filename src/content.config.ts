import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    author: z.string().default("Mtsprz"),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    modifiedTime: z.date().optional(),
  }),
});

export const collections = { blog };
