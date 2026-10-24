import { describe, expect, it } from 'vitest';

import {
  createMediaBodySchema,
  createRightsBodySchema,
  patchEpisodeBodySchema,
  reviewEpisodeBodySchema,
} from './admin-api';
import { apiErrorCodeSchema } from './catalogue-api';

describe('admin API schemas', () => {
  it('includes conflict for publishing preconditions', () => {
    expect(apiErrorCodeSchema.parse('CONFLICT')).toBe('CONFLICT');
  });

  it('rejects client-supplied processing status and rights approval', () => {
    expect(() =>
      createMediaBodySchema.parse({
        playbackManifestUrl: 'https://cdn.example/manifest.m3u8',
        processingStatus: 'READY',
      }),
    ).toThrow();
    expect(() =>
      createRightsBodySchema.parse({
        rightsType: 'ORIGINAL',
        sourceDescription: 'Owned script',
        approvedBy: 'editor',
        approvedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toThrow();
  });

  it('does not allow publishing an episode through PATCH', () => {
    expect(() => patchEpisodeBodySchema.parse({ status: 'PUBLISHED' })).toThrow();
    expect(patchEpisodeBodySchema.parse({ status: 'IN_REVIEW' })).toEqual({ status: 'IN_REVIEW' });
  });

  it('accepts human review decisions only', () => {
    expect(() => reviewEpisodeBodySchema.parse({ decision: 'PENDING' })).toThrow();
    expect(reviewEpisodeBodySchema.parse({ decision: 'APPROVED', notes: 'Clear' })).toEqual({
      decision: 'APPROVED',
      notes: 'Clear',
    });
  });
});
