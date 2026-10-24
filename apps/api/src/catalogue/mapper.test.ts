import { describe, expect, it } from 'vitest';

import { groupPublicCatalogue, isCurrentRightsApproved, toPublicEpisode } from './mapper.js';
import { catalogueTestRecords } from './test-records.js';

describe('catalogue mapper', () => {
  it('exposes only published episodes with READY media, approved rights, and approved review', () => {
    const { episodes, stories, universes } = groupPublicCatalogue(catalogueTestRecords);

    expect(universes.map((item) => item.slug)).toEqual(['guru-daiva-dutta']);
    expect(stories.map((item) => item.slug)).toEqual([
      'the-lamp-at-dusk',
      'the-river-crossing',
      'the-drum-of-the-grove',
    ]);
    expect(episodes.map((item) => item.slug)).toEqual([
      'a-sound-from-the-trees',
      'lighting-the-first-lamp',
      'neighbors-at-the-door',
      'waiting-on-the-bank',
    ]);
    expect(JSON.stringify(episodes)).not.toContain('sourceObjectKey');
    expect(JSON.stringify(episodes)).not.toContain('hidden-draft');
    expect(JSON.stringify(episodes)).not.toContain('secret/master');
  });

  it('treats expired rights as unapproved', () => {
    expect(
      isCurrentRightsApproved(
        [
          {
            approvedAt: '2026-01-01T00:00:00.000Z',
            approvedBy: 'editor-1',
            expiresAt: '2026-01-02T00:00:00.000Z',
          },
        ],
        Date.parse('2026-01-03T00:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('returns null for draft, not-ready, unapproved, and unreviewed rows', () => {
    const hidden = catalogueTestRecords.map((row) => toPublicEpisode(row)).filter(Boolean);
    expect(hidden).toHaveLength(4);
  });
});
