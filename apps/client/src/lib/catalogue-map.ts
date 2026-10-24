import type { Episode, PublicEpisode, PublicStory, PublicUniverse, Story } from '@daiva/domain';

import { catalogFixture } from '../fixtures/catalog';

import type { CatalogueEpisode, CatalogueStory, CatalogueUniverse } from './catalogue-types';

export function mapPublicUniverse(universe: PublicUniverse): CatalogueUniverse {
  return {
    id: universe.id,
    slug: universe.slug,
    title: universe.title,
    description: universe.description ?? '',
    primaryLanguage: universe.primaryLanguage,
    isSampleContent: universe.isSampleContent,
    sampleDisclaimer: universe.sampleDisclaimer,
  };
}

export function mapPublicStory(story: PublicStory): CatalogueStory {
  return {
    id: story.id,
    universeId: story.universeId,
    universeSlug: story.universeSlug,
    slug: story.slug,
    title: story.title,
    synopsis: story.synopsis ?? '',
    language: story.language,
    categorySlugs: story.categorySlugs,
    tags: story.tags,
    durationSeconds: story.durationSeconds ?? 0,
    featured: story.featured,
    sortOrder: story.sortOrder,
    contentNote: story.contentNote ?? '',
    isSampleContent: story.isSampleContent,
    sampleDisclaimer: story.sampleDisclaimer,
    publicEpisodeCount: story.publicEpisodeCount,
  };
}

export function mapPublicEpisode(episode: PublicEpisode): CatalogueEpisode {
  return {
    id: episode.id,
    storyId: episode.storyId,
    storySlug: episode.storySlug,
    universeSlug: episode.universeSlug,
    slug: episode.slug,
    title: episode.title,
    synopsis: episode.synopsis ?? '',
    episodeNumber: episode.episodeNumber,
    language: episode.language,
    durationSeconds: episode.durationSeconds ?? 0,
    captionsAvailable: episode.captionsAvailable,
    isSampleContent: episode.isSampleContent,
    sampleDisclaimer: episode.sampleDisclaimer,
  };
}

export function mapFixtureStory(story: Story): CatalogueStory {
  return {
    id: story.id,
    universeId: story.universeId,
    universeSlug: catalogFixture.universe.slug,
    slug: story.slug,
    title: story.title,
    synopsis: story.synopsis,
    language: story.language,
    categorySlugs: story.categorySlugs,
    tags: story.tags,
    durationSeconds: story.durationSeconds,
    featured: story.featured,
    sortOrder: story.sortOrder,
    contentNote: story.contentNote,
    isSampleContent: story.isSampleContent,
    sampleDisclaimer: story.sampleDisclaimer,
    publicEpisodeCount: catalogFixture.episodes.filter(
      (episode) => episode.storyId === story.id && episode.status === 'PUBLISHED',
    ).length,
  };
}

export function mapFixtureEpisode(episode: Episode, story: Story): CatalogueEpisode {
  return {
    id: episode.id,
    storyId: episode.storyId,
    storySlug: story.slug,
    universeSlug: catalogFixture.universe.slug,
    slug: episode.slug,
    title: episode.title,
    synopsis: episode.synopsis,
    episodeNumber: episode.episodeNumber,
    language: episode.language,
    durationSeconds: episode.durationSeconds,
    captionsAvailable: episode.captionsAvailable,
    isSampleContent: episode.isSampleContent,
    sampleDisclaimer: episode.sampleDisclaimer,
  };
}
