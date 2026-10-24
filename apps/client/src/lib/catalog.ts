import type { Category, Episode, Story, StoryUniverse } from '@daiva/domain';

import { catalogFixture } from '../fixtures/catalog';

export type StoryWithEpisodes = Story & { episodes: Episode[] };

export type SearchFilters = {
  query?: string;
  category?: string;
};

function isPublished(status: Story['status'] | Episode['status']): boolean {
  return status === 'PUBLISHED';
}

export function getUniverse(): StoryUniverse {
  return catalogFixture.universe;
}

export function listCategories(): Category[] {
  return catalogFixture.categories;
}

export function listPublishedStories(): Story[] {
  return catalogFixture.stories
    .filter((story) => isPublished(story.status))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function listFeaturedStories(): Story[] {
  return listPublishedStories().filter((story) => story.featured);
}

export function getStoryBySlug(slug: string): Story | undefined {
  return listPublishedStories().find((story) => story.slug === slug);
}

export function listEpisodesForStory(storyId: string): Episode[] {
  return catalogFixture.episodes
    .filter((episode) => episode.storyId === storyId && isPublished(episode.status))
    .sort((left, right) => left.episodeNumber - right.episodeNumber);
}

export function getStoryWithEpisodes(slug: string): StoryWithEpisodes | undefined {
  const story = getStoryBySlug(slug);
  if (!story) {
    return undefined;
  }

  return { ...story, episodes: listEpisodesForStory(story.id) };
}

export function getEpisodeById(episodeId: string): Episode | undefined {
  const episode = catalogFixture.episodes.find((item) => item.id === episodeId);
  if (!episode || !isPublished(episode.status)) {
    return undefined;
  }

  const story = listPublishedStories().find((item) => item.id === episode.storyId);
  return story ? episode : undefined;
}

export function getStoryForEpisode(episode: Episode): Story | undefined {
  return listPublishedStories().find((story) => story.id === episode.storyId);
}

export function searchCatalog({ query, category }: SearchFilters): Story[] {
  const normalizedQuery = query?.trim().toLowerCase() ?? '';

  return listPublishedStories().filter((story) => {
    const matchesCategory = category ? story.categorySlugs.includes(category) : true;
    if (!matchesCategory) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const episodeText = listEpisodesForStory(story.id)
      .map((episode) => `${episode.title} ${episode.synopsis}`)
      .join(' ');
    const haystack = [
      story.title,
      story.synopsis,
      story.language,
      story.contentNote,
      ...story.tags,
      ...story.categorySlugs,
      episodeText,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function listStaticStoryParams(): { slug: string }[] {
  return listPublishedStories().map((story) => ({ slug: story.slug }));
}

export function listStaticEpisodeParams(): { id: string }[] {
  return catalogFixture.episodes
    .filter((episode) => getEpisodeById(episode.id))
    .map((episode) => ({ id: episode.id }));
}
