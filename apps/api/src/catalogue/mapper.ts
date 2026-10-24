import {
  evaluatePublication,
  isReviewApproved,
  isRightsApproved,
  publicEpisodeSchema,
  publicStorySchema,
  publicUniverseSchema,
  type PublicEpisode,
  type PublicStory,
  type PublicUniverse,
  type PublicationInput,
} from '@daiva/domain';

import type { CatalogueEpisodeRecord, CatalogueRightsRecord } from './types.js';

function toTimestamp(value: Date | string): number {
  return value instanceof Date ? value.getTime() : Date.parse(value);
}

export function isCurrentRightsApproved(
  rights: CatalogueRightsRecord[],
  now = Date.now(),
): boolean {
  return rights.some((record) => {
    if (!isRightsApproved(record)) {
      return false;
    }
    if (record.expiresAt === null) {
      return true;
    }
    const expiresAt = toTimestamp(record.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
}

export function toPublicationInput(row: CatalogueEpisodeRecord): PublicationInput {
  const latestReview = [...row.reviews]
    .sort((left, right) => toTimestamp(left.createdAt) - toTimestamp(right.createdAt))
    .at(-1);

  return {
    universeStatus: row.story.universe.status,
    storyStatus: row.story.status,
    episodeStatus: row.status,
    hasMediaAsset: Boolean(row.mediaAssetId && row.media),
    mediaProcessingStatus: row.media?.processingStatus ?? null,
    rightsApproved: isCurrentRightsApproved(row.media?.rights ?? []),
    reviewApproved: isReviewApproved(latestReview?.decision ?? null),
  };
}

export function toPublicEpisode(row: CatalogueEpisodeRecord): PublicEpisode | null {
  const evaluation = evaluatePublication(toPublicationInput(row));
  if (!evaluation.isPublicCatalogue || row.media?.processingStatus !== 'READY') {
    return null;
  }

  return publicEpisodeSchema.parse({
    id: row.id,
    storyId: row.storyId,
    storySlug: row.story.slug,
    universeSlug: row.story.universe.slug,
    slug: row.slug,
    title: row.title,
    synopsis: row.synopsis,
    episodeNumber: row.episodeNumber,
    language: row.language,
    durationSeconds: row.durationSeconds,
    captionsAvailable: row.captionsAvailable,
    isSampleContent: row.isSampleContent,
    sampleDisclaimer: row.sampleDisclaimer,
    media: {
      id: row.media.id,
      playbackManifestUrl: row.media.playbackManifestUrl,
      posterUrl: row.media.posterUrl,
      captionsUrl: row.media.captionsUrl,
      durationSeconds: row.media.durationSeconds,
    },
  });
}

export function toPublicStory(
  row: CatalogueEpisodeRecord,
  publicEpisodeCount: number,
): PublicStory {
  return publicStorySchema.parse({
    id: row.story.id,
    universeId: row.story.universeId,
    universeSlug: row.story.universe.slug,
    slug: row.story.slug,
    title: row.story.title,
    synopsis: row.story.synopsis,
    language: row.story.language,
    categorySlugs: [...row.story.categorySlugs].sort(),
    tags: [...row.story.tags].sort(),
    durationSeconds: row.story.durationSeconds,
    featured: row.story.featured,
    sortOrder: row.story.sortOrder,
    contentNote: row.story.contentNote,
    isSampleContent: row.story.isSampleContent,
    sampleDisclaimer: row.story.sampleDisclaimer,
    publicEpisodeCount,
  });
}

export function toPublicUniverse(row: CatalogueEpisodeRecord): PublicUniverse {
  return publicUniverseSchema.parse({
    id: row.story.universe.id,
    slug: row.story.universe.slug,
    title: row.story.universe.title,
    description: row.story.universe.description,
    primaryLanguage: row.story.universe.primaryLanguage,
    isSampleContent: row.story.universe.isSampleContent,
    sampleDisclaimer: row.story.universe.sampleDisclaimer,
  });
}

export function selectPublicEpisodes(rows: CatalogueEpisodeRecord[]): PublicEpisode[] {
  return rows
    .map((row) => toPublicEpisode(row))
    .filter((episode): episode is PublicEpisode => episode !== null)
    .sort((left, right) => {
      if (left.storySlug !== right.storySlug) {
        return left.storySlug.localeCompare(right.storySlug);
      }
      if (left.episodeNumber !== right.episodeNumber) {
        return left.episodeNumber - right.episodeNumber;
      }
      return left.id.localeCompare(right.id);
    });
}

export function groupPublicCatalogue(rows: CatalogueEpisodeRecord[]): {
  episodes: PublicEpisode[];
  stories: PublicStory[];
  universes: PublicUniverse[];
} {
  const publicRows = rows.filter((row) => toPublicEpisode(row) !== null);
  const episodes = selectPublicEpisodes(publicRows);

  const storyCounts = new Map<string, number>();
  for (const episode of episodes) {
    storyCounts.set(episode.storyId, (storyCounts.get(episode.storyId) ?? 0) + 1);
  }

  const storiesById = new Map<string, PublicStory>();
  const universesById = new Map<string, PublicUniverse>();
  for (const row of publicRows) {
    const count = storyCounts.get(row.story.id) ?? 0;
    if (count === 0) {
      continue;
    }
    storiesById.set(row.story.id, toPublicStory(row, count));
    universesById.set(row.story.universe.id, toPublicUniverse(row));
  }

  const stories = [...storiesById.values()].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.id.localeCompare(right.id);
  });
  const universes = [...universesById.values()].sort((left, right) => {
    const titleOrder = left.title.localeCompare(right.title);
    return titleOrder !== 0 ? titleOrder : left.id.localeCompare(right.id);
  });

  return { episodes, stories, universes };
}
