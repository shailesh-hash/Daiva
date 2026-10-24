import { describe, expect, it } from 'vitest';

import {
  evaluateCatalogueEpisode,
  filterPublicCatalogueEpisodes,
  type CatalogueEpisodeRecord,
} from './public-catalogue.js';

const publishedReady: CatalogueEpisodeRecord = {
  universeStatus: 'PUBLISHED',
  storyStatus: 'PUBLISHED',
  episodeStatus: 'PUBLISHED',
  hasMediaAsset: true,
  mediaProcessingStatus: 'READY',
  rightsApproved: true,
  reviewApproved: true,
};

const seedShapedRows: CatalogueEpisodeRecord[] = [
  {
    universeStatus: 'DRAFT',
    storyStatus: 'DRAFT',
    episodeStatus: 'DRAFT',
    hasMediaAsset: true,
    mediaProcessingStatus: 'UPLOADED',
    rightsApproved: false,
    reviewApproved: false,
  },
  {
    universeStatus: 'DRAFT',
    storyStatus: 'DRAFT',
    episodeStatus: 'PUBLISHED',
    hasMediaAsset: true,
    mediaProcessingStatus: 'READY',
    rightsApproved: false,
    reviewApproved: false,
  },
  publishedReady,
];

describe('public catalogue filter', () => {
  it('does not treat a database row as public merely because it exists or is marked PUBLISHED', () => {
    const publishedWithoutApprovals = seedShapedRows[1];
    expect(publishedWithoutApprovals).toBeDefined();
    expect(evaluateCatalogueEpisode(publishedWithoutApprovals!).isPublicCatalogue).toBe(false);
    expect(filterPublicCatalogueEpisodes(seedShapedRows.slice(0, 2))).toEqual([]);
  });

  it('returns only episodes that pass publication preconditions', () => {
    expect(filterPublicCatalogueEpisodes(seedShapedRows)).toEqual([publishedReady]);
  });
});
