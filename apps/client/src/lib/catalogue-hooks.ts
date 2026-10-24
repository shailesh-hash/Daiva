import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';

import { createCatalogueLookup, getCatalogueSource } from './catalogue-source';
import type { CatalogueStory } from './catalogue-types';
import { catalogueKeys } from './query-client';

export function useUniversesQuery() {
  const source = getCatalogueSource();
  return useQuery({
    queryKey: catalogueKeys.universes(),
    queryFn: () => source.listUniverses(),
  });
}

export function useStoriesQuery(filters?: { category?: string; universe?: string }) {
  const source = getCatalogueSource();
  return useQuery({
    queryKey: catalogueKeys.stories(filters),
    queryFn: () => source.listStories(filters),
  });
}

export function useStoryQuery(slug: string | undefined) {
  const source = getCatalogueSource();
  return useQuery({
    queryKey: catalogueKeys.story(slug ?? ''),
    queryFn: () => source.getStory(slug ?? ''),
    enabled: Boolean(slug),
  });
}

export function useStoryEpisodesQuery(storySlug: string | undefined) {
  const source = getCatalogueSource();
  return useQuery({
    queryKey: catalogueKeys.episodes(storySlug ?? ''),
    queryFn: () => source.listStoryEpisodes(storySlug ?? ''),
    enabled: Boolean(storySlug),
  });
}

export function useEpisodeQuery(episodeId: string | undefined) {
  const source = getCatalogueSource();
  return useQuery({
    queryKey: catalogueKeys.episode(episodeId ?? ''),
    queryFn: () => source.getEpisode(episodeId ?? ''),
    enabled: Boolean(episodeId),
  });
}

export function useSearchStoriesQuery(query: string, category?: string) {
  const source = getCatalogueSource();
  const trimmed = query.trim();
  return useQuery({
    queryKey: catalogueKeys.search(trimmed, category),
    queryFn: () => source.searchStories(trimmed, category),
    enabled: trimmed.length > 0,
  });
}

export function useCatalogueSnapshot() {
  const storiesQuery = useStoriesQuery();
  const stories = storiesQuery.data ?? [];
  const source = getCatalogueSource();
  const episodeQueries = useQueries({
    queries: stories.map((story) => ({
      queryKey: catalogueKeys.episodes(story.slug),
      queryFn: () => source.listStoryEpisodes(story.slug),
    })),
  });

  const episodes = useMemo(
    () => episodeQueries.flatMap((result) => result.data ?? []),
    [episodeQueries],
  );

  return {
    storiesQuery,
    stories,
    episodes,
    lookup: createCatalogueLookup(stories, episodes),
  };
}

export function collectUniqueCategorySlugs(stories: CatalogueStory[]): string[] {
  return [...new Set(stories.flatMap((story) => story.categorySlugs))].sort();
}
