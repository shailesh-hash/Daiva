import { describe, expect, it } from 'vitest';

import { createLibraryStore } from './library-store';

describe('createLibraryStore', () => {
  it('toggles favorites only for published stories', () => {
    const store = createLibraryStore({ favoriteStoryIds: [], progress: [] });

    store.toggleFavorite('story-unpublished-draft');
    expect(store.listFavoriteStories()).toEqual([]);

    store.toggleFavorite('story-lamp-at-dusk');
    expect(store.isFavorite('story-lamp-at-dusk')).toBe(true);
    store.toggleFavorite('story-lamp-at-dusk');
    expect(store.isFavorite('story-lamp-at-dusk')).toBe(false);
  });

  it('omits completed and unpublished progress from continue watching', () => {
    const store = createLibraryStore({
      favoriteStoryIds: [],
      progress: [
        { episodeId: 'ep-lamp-01', positionSeconds: 20, completed: false },
        { episodeId: 'ep-river-01', positionSeconds: 110, completed: true },
        { episodeId: 'ep-draft-01', positionSeconds: 10, completed: false },
      ],
    });

    const items = store.listContinueWatching();
    expect(items).toHaveLength(1);
    expect(items[0]?.episode.id).toBe('ep-lamp-01');
  });

  it('records playback progress and hides completed episodes', () => {
    const store = createLibraryStore({ favoriteStoryIds: [], progress: [] });

    store.recordProgress('ep-lamp-02', 1.5, false);
    expect(store.getProgress('ep-lamp-02')).toEqual({
      episodeId: 'ep-lamp-02',
      positionSeconds: 1.5,
      completed: false,
    });
    expect(store.listContinueWatching()).toHaveLength(1);

    store.recordProgress('ep-lamp-02', 87.5, true);
    expect(store.getProgress('ep-lamp-02')?.completed).toBe(true);
    expect(store.listContinueWatching()).toHaveLength(0);
  });

  it('replaces account-backed library state on hydrate', () => {
    const store = createLibraryStore({
      favoriteStoryIds: ['story-lamp-at-dusk'],
      progress: [{ episodeId: 'ep-lamp-01', positionSeconds: 8, completed: false }],
    });

    store.hydrate({ favoriteStoryIds: [], progress: [] });
    expect(store.listFavoriteStories()).toEqual([]);
    expect(store.listContinueWatching()).toEqual([]);
  });
});
