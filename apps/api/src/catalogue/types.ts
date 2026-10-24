import type {
  CataloguePublishStatus,
  EpisodeListQuery,
  MediaProcessingStatus,
  PublicEpisode,
  PublicStory,
  PublicUniverse,
  ReviewDecision,
  SearchQuery,
  StoryListQuery,
  UniverseListQuery,
} from '@daiva/domain';

export type CatalogueRightsRecord = {
  approvedAt: Date | string | null;
  approvedBy: string | null;
  expiresAt: Date | string | null;
};

export type CatalogueReviewRecord = {
  decision: ReviewDecision;
  createdAt: Date | string;
};

export type CatalogueMediaRecord = {
  id: string;
  processingStatus: MediaProcessingStatus;
  playbackManifestUrl: string | null;
  posterUrl: string | null;
  captionsUrl: string | null;
  durationSeconds: number | null;
  rights: CatalogueRightsRecord[];
};

export type CatalogueUniverseRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  primaryLanguage: string;
  status: CataloguePublishStatus;
  isSampleContent: boolean;
  sampleDisclaimer: string | null;
};

export type CatalogueStoryRecord = {
  id: string;
  universeId: string;
  slug: string;
  title: string;
  synopsis: string | null;
  language: string;
  status: CataloguePublishStatus;
  sortOrder: number;
  featured: boolean;
  durationSeconds: number | null;
  contentNote: string | null;
  isSampleContent: boolean;
  sampleDisclaimer: string | null;
  categorySlugs: string[];
  tags: string[];
  universe: CatalogueUniverseRecord;
};

export type CatalogueEpisodeRecord = {
  id: string;
  storyId: string;
  slug: string;
  title: string;
  synopsis: string | null;
  episodeNumber: number;
  language: string;
  durationSeconds: number | null;
  captionsAvailable: boolean;
  isSampleContent: boolean;
  sampleDisclaimer: string | null;
  status: CataloguePublishStatus;
  mediaAssetId: string | null;
  story: CatalogueStoryRecord;
  media: CatalogueMediaRecord | null;
  reviews: CatalogueReviewRecord[];
};

export type CataloguePage<T> = {
  data: T[];
  page: { nextCursor: string | null };
};

export interface CatalogueRepository {
  listUniverses(query: UniverseListQuery): Promise<CataloguePage<PublicUniverse>>;
  getUniverseBySlug(slug: string): Promise<PublicUniverse | null>;
  listStories(query: StoryListQuery): Promise<CataloguePage<PublicStory>>;
  getStoryBySlug(slug: string): Promise<PublicStory | null>;
  getPublicStoryById(storyId: string): Promise<PublicStory | null>;
  listEpisodes(
    storySlug: string,
    query: EpisodeListQuery,
  ): Promise<CataloguePage<PublicEpisode> | 'story_not_found'>;
  getEpisodeById(episodeId: string): Promise<PublicEpisode | null>;
  search(query: SearchQuery): Promise<CataloguePage<import('@daiva/domain').SearchHit>>;
}
