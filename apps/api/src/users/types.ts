import type { PublicEpisode, PublicStory } from '@daiva/domain';

import type { AuthUser, UserDirectory } from '../auth/types.js';

export type FavoriteRecord = {
  id: string;
  userId: string;
  storyId: string;
  createdAt: Date;
  story: PublicStory;
};

export type ProgressRecord = {
  userId: string;
  episodeId: string;
  positionSeconds: number;
  completed: boolean;
  lastPlayedAt: Date;
  episode: PublicEpisode;
};

export type UserLibraryRepository = UserDirectory & {
  listFavorites(userId: string): Promise<FavoriteRecord[]>;
  addFavorite(userId: string, story: PublicStory): Promise<FavoriteRecord>;
  removeFavorite(userId: string, storyId: string): Promise<void>;
  listProgress(userId: string): Promise<ProgressRecord[]>;
  upsertProgress(
    userId: string,
    episode: PublicEpisode,
    input: { positionSeconds: number; completed: boolean },
  ): Promise<ProgressRecord>;
};

export type { AuthUser };
