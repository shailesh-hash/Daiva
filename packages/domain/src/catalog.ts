import { z } from 'zod';

export const publishStatusSchema = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'PUBLISHED',
  'UNPUBLISHED',
  'ARCHIVED',
]);

export const categorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
});

export const storyUniverseSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  primaryLanguage: z.string().min(2),
  status: publishStatusSchema,
  isSampleContent: z.literal(true),
  sampleDisclaimer: z.string().min(1),
});

export const storySchema = z.object({
  id: z.string().min(1),
  universeId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  synopsis: z.string().min(1),
  language: z.string().min(2),
  status: publishStatusSchema,
  categorySlugs: z.array(z.string().min(1)),
  tags: z.array(z.string().min(1)),
  durationSeconds: z.number().int().nonnegative(),
  featured: z.boolean(),
  sortOrder: z.number().int(),
  contentNote: z.string().min(1),
  isSampleContent: z.literal(true),
  sampleDisclaimer: z.string().min(1),
});

export const episodeSchema = z.object({
  id: z.string().min(1),
  storyId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  synopsis: z.string().min(1),
  episodeNumber: z.number().int().positive(),
  language: z.string().min(2),
  durationSeconds: z.number().int().positive(),
  status: publishStatusSchema,
  captionsAvailable: z.boolean(),
  isSampleContent: z.literal(true),
  sampleDisclaimer: z.string().min(1),
});

export const catalogFixtureSchema = z.object({
  universe: storyUniverseSchema,
  categories: z.array(categorySchema).min(1),
  stories: z.array(storySchema).min(1),
  episodes: z.array(episodeSchema).min(1),
});

export type PublishStatus = z.infer<typeof publishStatusSchema>;
export type Category = z.infer<typeof categorySchema>;
export type StoryUniverse = z.infer<typeof storyUniverseSchema>;
export type Story = z.infer<typeof storySchema>;
export type Episode = z.infer<typeof episodeSchema>;
export type CatalogFixture = z.infer<typeof catalogFixtureSchema>;
