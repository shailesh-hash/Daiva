import { z } from 'zod';

import {
  episodeListQuerySchema,
  languageCodeSchema,
  pageSchema,
  slugSchema,
} from './catalogue-api';
import {
  mediaProcessingStatusSchema,
  publishStatusSchemaValues,
  reviewDecisionSchema,
  rightsTypeSchema,
} from './publication';

export const adminIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const adminListQuerySchema = episodeListQuerySchema;

export const adminPublishStatusSchema = z.enum(publishStatusSchemaValues);

export const adminMutableStatusSchema = z.enum(['DRAFT', 'IN_REVIEW', 'UNPUBLISHED', 'ARCHIVED']);

export const publicationBlockerSchema = z.enum([
  'universe_not_published',
  'story_not_published',
  'media_missing',
  'media_not_ready',
  'rights_not_approved',
  'review_not_approved',
]);

export const publicationEvaluationSchema = z.object({
  canMarkPublished: z.boolean(),
  isPublicCatalogue: z.boolean(),
  blockers: z.array(publicationBlockerSchema),
});

export const adminUniverseSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  primaryLanguage: languageCodeSchema,
  status: adminPublishStatusSchema,
  isSampleContent: z.boolean(),
  sampleDisclaimer: z.string().nullable(),
});

export const createUniverseBodySchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).nullable().optional(),
    primaryLanguage: languageCodeSchema.default('kn'),
    isSampleContent: z.boolean().default(true),
    sampleDisclaimer: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const patchUniverseBodySchema = z
  .object({
    slug: slugSchema.optional(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    primaryLanguage: languageCodeSchema.optional(),
    status: adminPublishStatusSchema.optional(),
    isSampleContent: z.boolean().optional(),
    sampleDisclaimer: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const adminStorySchema = z.object({
  id: z.string().uuid(),
  universeId: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(250),
  synopsis: z.string().nullable(),
  language: languageCodeSchema,
  status: adminPublishStatusSchema,
  sortOrder: z.number().int(),
  featured: z.boolean(),
  contentNote: z.string().nullable(),
  isSampleContent: z.boolean(),
  sampleDisclaimer: z.string().nullable(),
});

export const createStoryBodySchema = z
  .object({
    universeId: z.string().uuid(),
    slug: slugSchema,
    title: z.string().trim().min(1).max(250),
    synopsis: z.string().trim().max(4000).nullable().optional(),
    language: languageCodeSchema.default('kn'),
    sortOrder: z.number().int().min(0).max(10_000).default(0),
    featured: z.boolean().default(false),
    contentNote: z.string().trim().max(500).nullable().optional(),
    isSampleContent: z.boolean().default(true),
    sampleDisclaimer: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const patchStoryBodySchema = z
  .object({
    universeId: z.string().uuid().optional(),
    slug: slugSchema.optional(),
    title: z.string().trim().min(1).max(250).optional(),
    synopsis: z.string().trim().max(4000).nullable().optional(),
    language: languageCodeSchema.optional(),
    status: adminPublishStatusSchema.optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
    featured: z.boolean().optional(),
    contentNote: z.string().trim().max(500).nullable().optional(),
    isSampleContent: z.boolean().optional(),
    sampleDisclaimer: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const adminMediaSchema = z.object({
  id: z.string().uuid(),
  processingStatus: mediaProcessingStatusSchema,
  playbackManifestUrl: z.string().nullable(),
  posterUrl: z.string().nullable(),
  captionsUrl: z.string().nullable(),
  durationSeconds: z.number().int().nonnegative().nullable(),
});

export const adminRightsSchema = z.object({
  id: z.string().uuid(),
  mediaAssetId: z.string().uuid(),
  rightsType: rightsTypeSchema,
  sourceDescription: z.string().min(1),
  evidenceUrl: z.string().nullable(),
  territory: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().datetime().nullable(),
});

export const adminReviewSchema = z.object({
  id: z.string().uuid(),
  episodeId: z.string().uuid(),
  reviewerId: z.string().uuid().nullable(),
  decision: reviewDecisionSchema,
  notes: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export const adminEpisodeSchema = z.object({
  id: z.string().uuid(),
  storyId: z.string().uuid(),
  universeId: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1).max(250),
  synopsis: z.string().nullable(),
  episodeNumber: z.number().int().positive(),
  language: languageCodeSchema,
  durationSeconds: z.number().int().nonnegative().nullable(),
  status: adminPublishStatusSchema,
  publishedAt: z.string().datetime().nullable(),
  captionsAvailable: z.boolean(),
  isSampleContent: z.boolean(),
  sampleDisclaimer: z.string().nullable(),
  media: adminMediaSchema.nullable(),
  rights: z.array(adminRightsSchema),
  reviews: z.array(adminReviewSchema),
  publication: publicationEvaluationSchema,
});

export const createEpisodeBodySchema = z
  .object({
    storyId: z.string().uuid(),
    slug: slugSchema,
    title: z.string().trim().min(1).max(250),
    synopsis: z.string().trim().max(4000).nullable().optional(),
    episodeNumber: z.number().int().positive().max(10_000),
    language: languageCodeSchema.default('kn'),
    isSampleContent: z.boolean().default(true),
    sampleDisclaimer: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const patchEpisodeBodySchema = z
  .object({
    slug: slugSchema.optional(),
    title: z.string().trim().min(1).max(250).optional(),
    synopsis: z.string().trim().max(4000).nullable().optional(),
    episodeNumber: z.number().int().positive().max(10_000).optional(),
    language: languageCodeSchema.optional(),
    status: adminMutableStatusSchema.optional(),
    isSampleContent: z.boolean().optional(),
    sampleDisclaimer: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const createMediaBodySchema = z
  .object({
    playbackManifestUrl: z.string().trim().max(2000).nullable().optional(),
    posterUrl: z.string().trim().max(2000).nullable().optional(),
    captionsUrl: z.string().trim().max(2000).nullable().optional(),
    durationSeconds: z.number().int().nonnegative().nullable().optional(),
  })
  .strict();

export const createRightsBodySchema = z
  .object({
    rightsType: rightsTypeSchema,
    sourceDescription: z.string().trim().min(1).max(4000),
    evidenceUrl: z.string().trim().max(2000).nullable().optional(),
    territory: z.string().trim().max(100).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
  })
  .strict();

export const submitReviewBodySchema = z
  .object({
    notes: z.string().trim().max(4000).nullable().optional(),
  })
  .strict();

export const reviewEpisodeBodySchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED', 'NEEDS_CHANGES']),
    notes: z.string().trim().max(4000).nullable().optional(),
  })
  .strict();

export const adminAuditSchema = z.object({
  id: z.string().uuid(),
  actorSubject: z.string().min(1),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  details: z.unknown().nullable(),
  createdAt: z.string().datetime(),
});

export const adminUniverseListResponseSchema = z.object({
  data: z.array(adminUniverseSchema),
  page: pageSchema,
});

export const adminStoryListResponseSchema = z.object({
  data: z.array(adminStorySchema),
  page: pageSchema,
});

export const adminEpisodeListResponseSchema = z.object({
  data: z.array(adminEpisodeSchema),
  page: pageSchema,
});

export const adminAuditListResponseSchema = z.object({
  data: z.array(adminAuditSchema),
  page: pageSchema,
});

export const adminUniverseMutationResponseSchema = z.object({
  data: adminUniverseSchema,
});

export const adminStoryMutationResponseSchema = z.object({
  data: adminStorySchema,
});

export const adminEpisodeMutationResponseSchema = z.object({
  data: adminEpisodeSchema,
});

export const adminRightsMutationResponseSchema = z.object({
  data: adminRightsSchema,
});

export type AdminUniverse = z.infer<typeof adminUniverseSchema>;
export type AdminStory = z.infer<typeof adminStorySchema>;
export type AdminEpisode = z.infer<typeof adminEpisodeSchema>;
export type AdminRights = z.infer<typeof adminRightsSchema>;
export type AdminReview = z.infer<typeof adminReviewSchema>;
export type AdminAudit = z.infer<typeof adminAuditSchema>;
export type CreateUniverseBody = z.infer<typeof createUniverseBodySchema>;
export type PatchUniverseBody = z.infer<typeof patchUniverseBodySchema>;
export type CreateStoryBody = z.infer<typeof createStoryBodySchema>;
export type PatchStoryBody = z.infer<typeof patchStoryBodySchema>;
export type CreateEpisodeBody = z.infer<typeof createEpisodeBodySchema>;
export type PatchEpisodeBody = z.infer<typeof patchEpisodeBodySchema>;
export type CreateMediaBody = z.infer<typeof createMediaBodySchema>;
export type CreateRightsBody = z.infer<typeof createRightsBodySchema>;
export type ReviewEpisodeBody = z.infer<typeof reviewEpisodeBodySchema>;
