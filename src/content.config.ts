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
    walkthroughs: z.array(z.object({
      title: z.string(),
      code: z.string(),
      language: z.string(),
      steps: z.array(z.object({
        lines: z.tuple([z.number(), z.number()]),
        annotation: z.string(),
      })),
    })).optional(),
    challenge: z.object({
      text: z.string(),
      hint: z.string().optional(),
    }).optional(),
  }),
});

export const collections = { sessions };
