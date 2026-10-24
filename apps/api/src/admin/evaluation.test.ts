import { describe, expect, it } from 'vitest';

import { evaluateAdminPublication } from './evaluation.js';

describe('admin publication evaluation', () => {
  it('blocks unprocessed media, unapproved rights, and unapproved review independently', () => {
    const result = evaluateAdminPublication({
      universeStatus: 'PUBLISHED',
      storyStatus: 'PUBLISHED',
      episodeStatus: 'IN_REVIEW',
      hasMediaAsset: true,
      mediaProcessingStatus: 'PROCESSING',
      rights: [{ approvedAt: null, approvedBy: null, expiresAt: null }],
      reviews: [{ decision: 'PENDING', createdAt: '2026-01-01T00:00:00.000Z' }],
    });

    expect(result.canMarkPublished).toBe(false);
    expect(result.blockers).toEqual([
      'media_not_ready',
      'rights_not_approved',
      'review_not_approved',
    ]);
  });
});
