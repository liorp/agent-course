import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const sessions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sessions' }),
  schema: z.object({
    title: z.string(),
    session: z.string(),
    phase: z.number(),
    motto: z.string(),
    order: z.number(),
    readingTime: z.number(),
    beginnerConcepts: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
  }),
});

export const collections = { sessions };
