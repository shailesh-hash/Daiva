import type {
  EpisodeListQuery,
  PublicEpisode,
  PublicStory,
  PublicUniverse,
  SearchHit,
  SearchQuery,
  StoryListQuery,
  UniverseListQuery,
} from '@daiva/domain';

import type { PrismaClient } from '../generated/prisma/client.js';
import { MemoryCatalogueRepository } from './memory-repository.js';
import type {
  CatalogueEpisodeRecord,
  CataloguePage,
  CatalogueRepository,
  CatalogueStoryRecord,
} from './types.js';

const publicCandidateInclude = {
  story: {
    include: {
      universe: true,
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  },
  currentMedia: { include: { rights: true } },
  reviews: true,
} as const;

type PrismaEpisodeRow = {
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
  status: CatalogueEpisodeRecord['status'];
  mediaAssetId: string | null;
  story: Omit<CatalogueStoryRecord, 'categorySlugs' | 'tags' | 'universe'> & {
    universe: CatalogueStoryRecord['universe'];
    categories: { category: { slug: string } }[];
    tags: { tag: { slug: string } }[];
  };
  currentMedia: {
    id: string;
    processingStatus: NonNullable<CatalogueEpisodeRecord['media']>['processingStatus'];
    playbackManifestUrl: string | null;
    posterUrl: string | null;
    captionsUrl: string | null;
    durationSeconds: number | null;
    rights: {
      approvedAt: Date | null;
      approvedBy: string | null;
      expiresAt: Date | null;
    }[];
  } | null;
  reviews: CatalogueEpisodeRecord['reviews'];
};

export function mapPrismaEpisode(row: PrismaEpisodeRow): CatalogueEpisodeRecord {
  return {
    id: row.id,
    storyId: row.storyId,
    slug: row.slug,
    title: row.title,
    synopsis: row.synopsis,
    episodeNumber: row.episodeNumber,
    language: row.language,
    durationSeconds: row.durationSeconds,
    captionsAvailable: row.captionsAvailable,
    isSampleContent: row.isSampleContent,
    sampleDisclaimer: row.sampleDisclaimer,
    status: row.status,
    mediaAssetId: row.mediaAssetId,
    story: {
      id: row.story.id,
      universeId: row.story.universeId,
      slug: row.story.slug,
      title: row.story.title,
      synopsis: row.story.synopsis,
      language: row.story.language,
      status: row.story.status,
      sortOrder: row.story.sortOrder,
      featured: row.story.featured,
      durationSeconds: row.story.durationSeconds,
      contentNote: row.story.contentNote,
      isSampleContent: row.story.isSampleContent,
      sampleDisclaimer: row.story.sampleDisclaimer,
      categorySlugs: row.story.categories.map((entry) => entry.category.slug),
      tags: row.story.tags.map((entry) => entry.tag.slug),
      universe: {
        id: row.story.universe.id,
        slug: row.story.universe.slug,
        title: row.story.universe.title,
        description: row.story.universe.description,
        primaryLanguage: row.story.universe.primaryLanguage,
        status: row.story.universe.status,
        isSampleContent: row.story.universe.isSampleContent,
        sampleDisclaimer: row.story.universe.sampleDisclaimer,
      },
    },
    media: row.currentMedia
      ? {
          id: row.currentMedia.id,
          processingStatus: row.currentMedia.processingStatus,
          playbackManifestUrl: row.currentMedia.playbackManifestUrl,
          posterUrl: row.currentMedia.posterUrl,
          captionsUrl: row.currentMedia.captionsUrl,
          durationSeconds: row.currentMedia.durationSeconds,
          rights: row.currentMedia.rights.map((rights) => ({
            approvedAt: rights.approvedAt,
            approvedBy: rights.approvedBy,
            expiresAt: rights.expiresAt,
          })),
        }
      : null,
    reviews: row.reviews.map((review) => ({
      decision: review.decision,
      createdAt: review.createdAt,
    })),
  };
}

export class PrismaCatalogueRepository implements CatalogueRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listUniverses(query: UniverseListQuery): Promise<CataloguePage<PublicUniverse>> {
    return (await this.delegate()).listUniverses(query);
  }

  async getUniverseBySlug(slug: string): Promise<PublicUniverse | null> {
    return (await this.delegate()).getUniverseBySlug(slug);
  }

  async listStories(query: StoryListQuery): Promise<CataloguePage<PublicStory>> {
    return (await this.delegate()).listStories(query);
  }

  async getStoryBySlug(slug: string): Promise<PublicStory | null> {
    return (await this.delegate()).getStoryBySlug(slug);
  }

  async getPublicStoryById(storyId: string): Promise<PublicStory | null> {
    return (await this.delegate()).getPublicStoryById(storyId);
  }

  async listEpisodes(
    storySlug: string,
    query: EpisodeListQuery,
  ): Promise<CataloguePage<PublicEpisode> | 'story_not_found'> {
    return (await this.delegate()).listEpisodes(storySlug, query);
  }

  async getEpisodeById(episodeId: string): Promise<PublicEpisode | null> {
    return (await this.delegate()).getEpisodeById(episodeId);
  }

  async search(query: SearchQuery): Promise<CataloguePage<SearchHit>> {
    return (await this.delegate()).search(query);
  }

  private async delegate(): Promise<MemoryCatalogueRepository> {
    const rows = await this.prisma.episode.findMany({
      where: {
        status: 'PUBLISHED',
        story: {
          status: 'PUBLISHED',
          universe: { status: 'PUBLISHED' },
        },
        mediaAssetId: { not: null },
        currentMedia: { is: { processingStatus: 'READY' } },
      },
      include: publicCandidateInclude,
    });

    return new MemoryCatalogueRepository(rows.map((row) => mapPrismaEpisode(row)));
  }
}
