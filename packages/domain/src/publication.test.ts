import { describe, expect, it } from 'vitest';

import {
  evaluatePublication,
  isReviewApproved,
  isRightsApproved,
  type PublicationInput,
} from './publication';

const eligible: PublicationInput = {
  universeStatus: 'PUBLISHED',
  storyStatus: 'PUBLISHED',
  episodeStatus: 'PUBLISHED',
  hasMediaAsset: true,
  mediaProcessingStatus: 'READY',
  rightsApproved: true,
  reviewApproved: true,
};

describe('publication rules', () => {
  it('treats rights as approved only when both approver and timestamp exist', () => {
    expect(isRightsApproved({ approvedAt: null, approvedBy: 'editor-1' })).toBe(false);
    expect(isRightsApproved({ approvedAt: new Date(), approvedBy: '  ' })).toBe(false);
    expect(isRightsApproved({ approvedAt: new Date(), approvedBy: 'editor-1' })).toBe(true);
  });

  it('treats review as approved only for APPROVED decisions', () => {
    expect(isReviewApproved(null)).toBe(false);
    expect(isReviewApproved('PENDING')).toBe(false);
    expect(isReviewApproved('NEEDS_CHANGES')).toBe(false);
    expect(isReviewApproved('APPROVED')).toBe(true);
  });

  it('does not treat a published row as public when preconditions fail', () => {
    const result = evaluatePublication({
      ...eligible,
      hasMediaAsset: false,
      mediaProcessingStatus: null,
      rightsApproved: false,
      reviewApproved: false,
    });

    expect(result.canMarkPublished).toBe(false);
    expect(result.isPublicCatalogue).toBe(false);
    expect(result.blockers).toEqual([
      'media_missing',
      'rights_not_approved',
      'review_not_approved',
    ]);
  });

  it('blocks unpublished parent universe or story even when the episode is published', () => {
    const result = evaluatePublication({
      ...eligible,
      universeStatus: 'DRAFT',
      storyStatus: 'DRAFT',
    });

    expect(result.isPublicCatalogue).toBe(false);
    expect(result.blockers).toEqual(['universe_not_published', 'story_not_published']);
  });

  it('blocks media that exists but is not READY', () => {
    const result = evaluatePublication({
      ...eligible,
      mediaProcessingStatus: 'PROCESSING',
    });

    expect(result.blockers).toEqual(['media_not_ready']);
    expect(result.isPublicCatalogue).toBe(false);
  });

  it('allows marking published only when every precondition is met', () => {
    const result = evaluatePublication({
      ...eligible,
      episodeStatus: 'IN_REVIEW',
    });

    expect(result.canMarkPublished).toBe(true);
    expect(result.isPublicCatalogue).toBe(false);
  });

  it('exposes a public catalogue item only when status is PUBLISHED and preconditions pass', () => {
    expect(evaluatePublication(eligible)).toEqual({
      canMarkPublished: true,
      isPublicCatalogue: true,
      blockers: [],
    });
  });
});
