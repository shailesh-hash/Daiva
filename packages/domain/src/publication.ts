import { z } from 'zod';

export const mediaProcessingStatusSchema = z.enum([
  'UPLOADED',
  'QUEUED',
  'PROCESSING',
  'READY',
  'FAILED',
]);

export const rightsTypeSchema = z.enum(['ORIGINAL', 'COMMISSIONED', 'LICENSED', 'PUBLIC_DOMAIN']);

export const reviewDecisionSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES']);

export const publishStatusSchemaValues = [
  'DRAFT',
  'IN_REVIEW',
  'PUBLISHED',
  'UNPUBLISHED',
  'ARCHIVED',
] as const;

export type MediaProcessingStatus = z.infer<typeof mediaProcessingStatusSchema>;
export type RightsType = z.infer<typeof rightsTypeSchema>;
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
export type CataloguePublishStatus = (typeof publishStatusSchemaValues)[number];

export type PublicationInput = {
  universeStatus: CataloguePublishStatus;
  storyStatus: CataloguePublishStatus;
  episodeStatus: CataloguePublishStatus;
  hasMediaAsset: boolean;
  mediaProcessingStatus: MediaProcessingStatus | null;
  rightsApproved: boolean;
  reviewApproved: boolean;
};

export const publicationBlockers = [
  'universe_not_published',
  'story_not_published',
  'media_missing',
  'media_not_ready',
  'rights_not_approved',
  'review_not_approved',
] as const;

export type PublicationBlocker = (typeof publicationBlockers)[number];

export type PublicationEvaluation = {
  canMarkPublished: boolean;
  isPublicCatalogue: boolean;
  blockers: PublicationBlocker[];
};

export function isRightsApproved(rights: {
  approvedAt: Date | string | null;
  approvedBy: string | null;
}): boolean {
  return Boolean(rights.approvedAt && rights.approvedBy?.trim());
}

export function isReviewApproved(decision: ReviewDecision | null): boolean {
  return decision === 'APPROVED';
}

export function evaluatePublication(input: PublicationInput): PublicationEvaluation {
  const blockers: PublicationBlocker[] = [];

  if (input.universeStatus !== 'PUBLISHED') {
    blockers.push('universe_not_published');
  }
  if (input.storyStatus !== 'PUBLISHED') {
    blockers.push('story_not_published');
  }
  if (!input.hasMediaAsset) {
    blockers.push('media_missing');
  } else if (input.mediaProcessingStatus !== 'READY') {
    blockers.push('media_not_ready');
  }
  if (!input.rightsApproved) {
    blockers.push('rights_not_approved');
  }
  if (!input.reviewApproved) {
    blockers.push('review_not_approved');
  }

  return {
    canMarkPublished: blockers.length === 0,
    isPublicCatalogue: input.episodeStatus === 'PUBLISHED' && blockers.length === 0,
    blockers,
  };
}
