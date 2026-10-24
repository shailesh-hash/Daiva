import {
  evaluatePublication,
  isReviewApproved,
  type CataloguePublishStatus,
  type PublicationEvaluation,
} from '@daiva/domain';

import { isCurrentRightsApproved } from '../catalogue/mapper.js';
import type { CatalogueRightsRecord } from '../catalogue/types.js';

export type AdminPublicationSource = {
  universeStatus: CataloguePublishStatus;
  storyStatus: CataloguePublishStatus;
  episodeStatus: CataloguePublishStatus;
  hasMediaAsset: boolean;
  mediaProcessingStatus: 'UPLOADED' | 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED' | null;
  rights: CatalogueRightsRecord[];
  reviews: {
    decision: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES';
    createdAt: Date | string;
  }[];
};

export function evaluateAdminPublication(source: AdminPublicationSource): PublicationEvaluation {
  const latestReview = [...source.reviews]
    .sort((left, right) => Date.parse(String(left.createdAt)) - Date.parse(String(right.createdAt)))
    .at(-1);

  return evaluatePublication({
    universeStatus: source.universeStatus,
    storyStatus: source.storyStatus,
    episodeStatus: source.episodeStatus,
    hasMediaAsset: source.hasMediaAsset,
    mediaProcessingStatus: source.mediaProcessingStatus,
    rightsApproved: isCurrentRightsApproved(source.rights),
    reviewApproved: isReviewApproved(latestReview?.decision ?? null),
  });
}
