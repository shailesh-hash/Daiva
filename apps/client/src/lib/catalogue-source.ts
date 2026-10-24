import { ApiClient, ApiClientError } from '@daiva/api-client';

import { catalogFixture } from '../fixtures/catalog';

import {
  getEpisodeById,
  getStoryBySlug,
  getStoryWithEpisodes,
  getUniverse,
  listEpisodesForStory,
  listPublishedStories,
  searchCatalog,
} from './catalog';
import {
  mapFixtureEpisode,
  mapFixtureStory,
  mapPublicEpisode,
  mapPublicStory,
  mapPublicUniverse,
} from './catalogue-map';
import type { CatalogueEpisode, CatalogueStory, CatalogueUniverse } from './catalogue-types';
import { getApiClient } from './api-access';
import { shouldUseCatalogueFixtures } from './config';

export type CatalogueSource = {
  listUniverses(): Promise<CatalogueUniverse[]>;
  getUniverse(slug: string): Promise<CatalogueUniverse>;
  listStories(filters?: {
    universe?: string;
    category?: string;
    language?: string;
  }): Promise<CatalogueStory[]>;
  getStory(slug: string): Promise<CatalogueStory>;
  listStoryEpisodes(storySlug: string): Promise<CatalogueEpisode[]>;
  getEpisode(episodeId: string): Promise<CatalogueEpisode>;
  searchStories(query: string, category?: string): Promise<CatalogueStory[]>;
};

function notFound(entity: string): ApiClientError {
  return new ApiClientError(`${entity} not found`, 404, 'NOT_FOUND');
}

function createFixtureSource(): CatalogueSource {
  return {
    async listUniverses() {
      const universe = getUniverse();
      return universe.status === 'PUBLISHED'
        ? [
            {
              id: universe.id,
              slug: universe.slug,
              title: universe.title,
              description: universe.description,
              primaryLanguage: universe.primaryLanguage,
              isSampleContent: universe.isSampleContent,
              sampleDisclaimer: universe.sampleDisclaimer,
            },
          ]
        : [];
    },
    async getUniverse(slug) {
      const universe = getUniverse();
      if (universe.slug !== slug || universe.status !== 'PUBLISHED') {
        throw notFound('Universe');
      }
      return {
        id: universe.id,
        slug: universe.slug,
        title: universe.title,
        description: universe.description,
        primaryLanguage: universe.primaryLanguage,
        isSampleContent: universe.isSampleContent,
        sampleDisclaimer: universe.sampleDisclaimer,
      };
    },
    async listStories(filters = {}) {
      return listPublishedStories()
        .filter((story) =>
          filters.universe ? story.universeId === catalogFixture.universe.id : true,
        )
        .filter((story) => (filters.language ? story.language === filters.language : true))
        .filter((story) =>
          filters.category ? story.categorySlugs.includes(filters.category) : true,
        )
        .map(mapFixtureStory);
    },
    async getStory(slug) {
      const story = getStoryBySlug(slug);
      if (!story) {
        throw notFound('Story');
      }
      return mapFixtureStory(story);
    },
    async listStoryEpisodes(storySlug) {
      const story = getStoryWithEpisodes(storySlug);
      if (!story) {
        throw notFound('Story');
      }
      return story.episodes.map((episode) => mapFixtureEpisode(episode, story));
    },
    async getEpisode(episodeId) {
      const episode = getEpisodeById(episodeId);
      const story = episode
        ? listPublishedStories().find((item) => item.id === episode.storyId)
        : undefined;
      if (!episode || !story) {
        throw notFound('Episode');
      }
      return mapFixtureEpisode(episode, story);
    },
    async searchStories(query, category) {
      return searchCatalog({ query, category }).map(mapFixtureStory);
    },
  };
}

function createApiSource(client: ApiClient): CatalogueSource {
  return {
    async listUniverses() {
      return (await client.listUniverses({ limit: 50 })).map(mapPublicUniverse);
    },
    async getUniverse(slug) {
      return mapPublicUniverse(await client.getUniverse(slug));
    },
    async listStories(filters = {}) {
      return (
        await client.listStories({
          limit: 50,
          universe: filters.universe,
          category: filters.category,
          language: filters.language,
        })
      ).map(mapPublicStory);
    },
    async getStory(slug) {
      return mapPublicStory(await client.getStory(slug));
    },
    async listStoryEpisodes(storySlug) {
      return (await client.listStoryEpisodes(storySlug, { limit: 50 })).map(mapPublicEpisode);
    },
    async getEpisode(episodeId) {
      return mapPublicEpisode(await client.getEpisode(episodeId));
    },
    async searchStories(query, category) {
      const hits = await client.search({ q: query, limit: 50 });
      const stories = new Map<string, CatalogueStory>();
      for (const hit of hits) {
        if (hit.type === 'story') {
          const story = mapPublicStory(hit.story);
          if (!category || story.categorySlugs.includes(category)) {
            stories.set(story.id, story);
          }
        }
        if (hit.type === 'episode') {
          const story = await client.getStory(hit.episode.storySlug).then(mapPublicStory);
          if (!category || story.categorySlugs.includes(category)) {
            stories.set(story.id, story);
          }
        }
      }
      return [...stories.values()].sort((left, right) => left.sortOrder - right.sortOrder);
    },
  };
}

export function getCatalogueSource(): CatalogueSource {
  if (shouldUseCatalogueFixtures()) {
    return createFixtureSource();
  }

  return createApiSource(getApiClient());
}

export function createCatalogueLookup(stories: CatalogueStory[], episodes: CatalogueEpisode[]) {
  const storiesById = new Map(stories.map((story) => [story.id, story]));
  const episodesById = new Map(episodes.map((episode) => [episode.id, episode]));

  return {
    getStoryById(id: string): CatalogueStory | undefined {
      return storiesById.get(id);
    },
    getEpisodeById(id: string): CatalogueEpisode | undefined {
      return episodesById.get(id);
    },
    getStoryForEpisode(episode: CatalogueEpisode): CatalogueStory | undefined {
      return storiesById.get(episode.storyId);
    },
  };
}

export function createFixtureCatalogueLookup() {
  const stories = listPublishedStories().map(mapFixtureStory);
  const episodes = stories
    .flatMap((story) =>
      listEpisodesForStory(story.id).map((episode) => {
        const fixtureStory = listPublishedStories().find((item) => item.id === story.id);
        return fixtureStory ? mapFixtureEpisode(episode, fixtureStory) : undefined;
      }),
    )
    .filter((episode): episode is CatalogueEpisode => episode !== undefined);

  return createCatalogueLookup(stories, episodes);
}
