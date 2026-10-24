import { z } from 'zod';

import {
  episodeIdSchema,
  episodeListQuerySchema,
  pageSchema,
  publicEpisodeSchema,
  publicStoryListResponseSchema,
  publicStorySchema,
} from './catalogue-api';

export const meUserSchema = z.object({
  id: z.string().uuid(),
  preferredLanguage: z.string().nullable(),
  isAdmin: z.boolean(),
});

export const favoriteStoryParamsSchema = z.object({
  storyId: z.string().uuid(),
});

export const progressEpisodeParamsSchema = z.object({
  episodeId: episodeIdSchema,
});

export const upsertProgressBodySchema = z.object({
  positionSeconds: z.number().int().min(0).max(86_400),
  completed: z.boolean(),
});

export const userProgressSchema = z.object({
  episodeId: z.string().uuid(),
  positionSeconds: z.number().int().min(0),
  completed: z.boolean(),
  lastPlayedAt: z.string().datetime(),
  episode: publicEpisodeSchema,
});

export const userProgressListResponseSchema = z.object({
  data: z.array(userProgressSchema),
  page: pageSchema,
});

export const favoriteMutationResponseSchema = z.object({
  data: publicStorySchema,
});

export const favoriteDeleteResponseSchema = z.object({
  data: z.object({
    storyId: z.string().uuid(),
  }),
});

export const userProgressMutationResponseSchema = z.object({
  data: userProgressSchema,
});

export const favoriteListQuerySchema = episodeListQuerySchema;
export const progressListQuerySchema = episodeListQuerySchema;
export const favoriteListResponseSchema = publicStoryListResponseSchema;

export const devSessionBodySchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9._:-]+$/, 'subject must be a stable identity label'),
});

export const devSessionResponseSchema = z.object({
  tokenType: z.literal('Bearer'),
  accessToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
});

export type MeUser = z.infer<typeof meUserSchema>;
export type UpsertProgressBody = z.infer<typeof upsertProgressBodySchema>;
export type UserProgress = z.infer<typeof userProgressSchema>;
export type DevSessionBody = z.infer<typeof devSessionBodySchema>;
export type DevSessionResponse = z.infer<typeof devSessionResponseSchema>;
