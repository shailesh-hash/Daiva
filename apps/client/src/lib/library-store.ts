import { createFixtureCatalogueLookup } from './catalogue-source';
import type { CatalogueEpisode, CatalogueStory } from './catalogue-types';

export type PlaybackProgress = {
  episodeId: string;
  positionSeconds: number;
  completed: boolean;
};

export type LibraryState = {
  favoriteStoryIds: string[];
  progress: PlaybackProgress[];
};

export type ContinueWatchingItem = {
  episode: CatalogueEpisode;
  story: CatalogueStory;
  progress: PlaybackProgress;
};

export type LibraryCatalogueLookup = {
  getStoryById(id: string): CatalogueStory | undefined;
  getEpisodeById(id: string): CatalogueEpisode | undefined;
  getStoryForEpisode(episode: CatalogueEpisode): CatalogueStory | undefined;
};

export function createLibraryStore(
  initial: LibraryState,
  lookup: LibraryCatalogueLookup = createFixtureCatalogueLookup(),
) {
  let catalogueLookup = lookup;
  let state: LibraryState = {
    favoriteStoryIds: [...initial.favoriteStoryIds],
    progress: initial.progress.map((item) => ({ ...item })),
  };
  const listeners = new Set<() => void>();

  function emit(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getState(): LibraryState {
      return state;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    isFavorite(storyId: string): boolean {
      return state.favoriteStoryIds.includes(storyId);
    },
    setLookup(next: LibraryCatalogueLookup): void {
      catalogueLookup = next;
      emit();
    },
    hydrate(next: LibraryState): void {
      state = {
        favoriteStoryIds: [...next.favoriteStoryIds],
        progress: next.progress.map((item) => ({ ...item })),
      };
      emit();
    },
    toggleFavorite(storyId: string): void {
      if (!catalogueLookup.getStoryById(storyId)) {
        return;
      }

      state = state.favoriteStoryIds.includes(storyId)
        ? {
            ...state,
            favoriteStoryIds: state.favoriteStoryIds.filter((id) => id !== storyId),
          }
        : { ...state, favoriteStoryIds: [...state.favoriteStoryIds, storyId] };
      emit();
    },
    listFavoriteStories(): CatalogueStory[] {
      return state.favoriteStoryIds.flatMap((id) => {
        const story = catalogueLookup.getStoryById(id);
        return story ? [story] : [];
      });
    },
    recordProgress(episodeId: string, positionSeconds: number, completed: boolean): void {
      if (!catalogueLookup.getEpisodeById(episodeId)) {
        return;
      }

      const next: PlaybackProgress = { episodeId, positionSeconds, completed };
      const existing = state.progress.findIndex((item) => item.episodeId === episodeId);
      state =
        existing === -1
          ? { ...state, progress: [...state.progress, next] }
          : {
              ...state,
              progress: state.progress.map((item, index) => (index === existing ? next : item)),
            };
      emit();
    },
    getProgress(episodeId: string): PlaybackProgress | undefined {
      return state.progress.find((item) => item.episodeId === episodeId);
    },
    listContinueWatching(): ContinueWatchingItem[] {
      return state.progress.flatMap((progress) => {
        if (progress.completed) {
          return [];
        }

        const episode = catalogueLookup.getEpisodeById(progress.episodeId);
        if (!episode) {
          return [];
        }

        const story = catalogueLookup.getStoryForEpisode(episode);
        if (!story) {
          return [];
        }

        return [{ episode, story, progress }];
      });
    },
  };
}

export type LibraryStore = ReturnType<typeof createLibraryStore>;
