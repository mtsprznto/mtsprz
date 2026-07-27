import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    modifiedTime: z.date().optional(),
    image: z.string().default("/logo.jpg"),
    author: z.string().default("Matías Pérez Nauto"),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
