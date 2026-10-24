import { isRetryableApiError } from '@daiva/api-client';
import { QueryClient } from '@tanstack/react-query';

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return isRetryableApiError(error) && failureCount < 1;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetryQuery,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export const catalogueKeys = {
  all: ['catalogue'] as const,
  universes: () => [...catalogueKeys.all, 'universes'] as const,
  stories: (filters?: { category?: string; universe?: string }) =>
    [...catalogueKeys.all, 'stories', filters ?? {}] as const,
  story: (slug: string) => [...catalogueKeys.all, 'story', slug] as const,
  episodes: (storySlug: string) => [...catalogueKeys.all, 'episodes', storySlug] as const,
  episode: (id: string) => [...catalogueKeys.all, 'episode', id] as const,
  search: (query: string, category?: string) =>
    [...catalogueKeys.all, 'search', query, category ?? ''] as const,
};

export const userKeys = {
  all: ['user'] as const,
  me: () => [...userKeys.all, 'me'] as const,
  favorites: () => [...userKeys.all, 'favorites'] as const,
  progress: () => [...userKeys.all, 'progress'] as const,
};

export const adminKeys = {
  all: ['admin'] as const,
  universes: () => [...adminKeys.all, 'universes'] as const,
  universe: (id: string) => [...adminKeys.all, 'universe', id] as const,
  stories: () => [...adminKeys.all, 'stories'] as const,
  story: (id: string) => [...adminKeys.all, 'story', id] as const,
  episodes: () => [...adminKeys.all, 'episodes'] as const,
  episode: (id: string) => [...adminKeys.all, 'episode', id] as const,
  audit: () => [...adminKeys.all, 'audit'] as const,
};
