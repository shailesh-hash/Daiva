import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import { sampleLibrarySeed } from '../fixtures/catalog';

import { useAuth } from './auth-context';
import { useCatalogueSnapshot } from './catalogue-hooks';
import { createCatalogueLookup, createFixtureCatalogueLookup } from './catalogue-source';
import { shouldUseCatalogueFixtures } from './config';
import { createLibraryStore, type LibraryStore } from './library-store';
import { useFavoritesQuery, useProgressQuery } from './user-hooks';

const LibraryStoreContext = createContext<LibraryStore | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const favoritesQuery = useFavoritesQuery();
  const progressQuery = useProgressQuery();
  const { stories, episodes } = useCatalogueSnapshot();
  const store = useMemo(
    () =>
      createLibraryStore(
        shouldUseCatalogueFixtures()
          ? {
              favoriteStoryIds: [...sampleLibrarySeed.favoriteStoryIds],
              progress: sampleLibrarySeed.progress.map((item) => ({ ...item })),
            }
          : { favoriteStoryIds: [], progress: [] },
      ),
    [],
  );

  useEffect(() => {
    store.setLookup(
      shouldUseCatalogueFixtures()
        ? createFixtureCatalogueLookup()
        : createCatalogueLookup(stories, episodes),
    );
  }, [episodes, store, stories]);

  useEffect(() => {
    if (shouldUseCatalogueFixtures() || auth.status !== 'signedIn') {
      if (!shouldUseCatalogueFixtures() && auth.status === 'signedOut') {
        store.hydrate({ favoriteStoryIds: [], progress: [] });
      }
      return;
    }
    if (!favoritesQuery.data || !progressQuery.data) {
      return;
    }
    store.hydrate({
      favoriteStoryIds: favoritesQuery.data.map((story) => story.id),
      progress: progressQuery.data.map((item) => ({
        episodeId: item.episodeId,
        positionSeconds: item.positionSeconds,
        completed: item.completed,
      })),
    });
  }, [auth.status, favoritesQuery.data, progressQuery.data, store]);

  return <LibraryStoreContext.Provider value={store}>{children}</LibraryStoreContext.Provider>;
}

export function useLibraryStore(): LibraryStore {
  const store = useContext(LibraryStoreContext);
  if (!store) {
    throw new Error('useLibraryStore must be used within LibraryProvider');
  }
  return store;
}

export function useLibrarySnapshot() {
  const store = useLibraryStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
