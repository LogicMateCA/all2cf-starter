import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const publicationState = {
  draft: z.boolean().default(false),
  sample: z.boolean().default(false),
};

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    author: z.string().min(1),
    tags: z.array(z.string()).default([]),
    ...publicationState,
  }),
});

const caseStudies = defineCollection({
  loader: glob({ base: "./src/content/case-studies", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    customer: z.string().min(1),
    industry: z.string().min(1),
    publishedAt: z.coerce.date(),
    outcomes: z.array(z.object({ label: z.string().min(1), value: z.string().min(1), evidence: z.string().min(1) })).min(1),
    ...publicationState,
  }),
});

const careers = defineCollection({
  loader: glob({ base: "./src/content/careers", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    team: z.string().min(1),
    location: z.string().min(1),
    workplace: z.enum(["remote", "hybrid", "onsite"]),
    employmentType: z.string().min(1),
    postedAt: z.coerce.date(),
    applicationUrl: z.string().min(1).optional(),
    ...publicationState,
  }),
});

const integrations = defineCollection({
  loader: glob({ base: "./src/content/integrations", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    category: z.string().min(1),
    availability: z.enum(["available", "beta", "planned", "unavailable"]),
    setupPath: z.string().min(1).optional(),
    ...publicationState,
  }),
});

export const collections = { blog, careers, "case-studies": caseStudies, integrations };
