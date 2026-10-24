import { randomUUID } from 'node:crypto';

import type { PublicEpisode, PublicStory } from '@daiva/domain';

import type { AuthUser } from '../auth/types.js';
import type { FavoriteRecord, ProgressRecord, UserLibraryRepository } from './types.js';

type StoredUser = AuthUser & { deleted: boolean };

export class MemoryUserLibraryRepository implements UserLibraryRepository {
  private readonly usersBySubject = new Map<string, StoredUser>();
  private readonly favorites = new Map<string, FavoriteRecord>();
  private readonly progress = new Map<string, ProgressRecord>();

  constructor(seedUsers: AuthUser[] = []) {
    for (const user of seedUsers) {
      this.usersBySubject.set(user.subject, { ...user, deleted: false });
    }
  }

  markDeleted(subject: string): void {
    const user = this.usersBySubject.get(subject);
    if (user) {
      user.deleted = true;
    }
  }

  async resolveBySubject(subject: string): Promise<AuthUser | 'deleted'> {
    const existing = this.usersBySubject.get(subject);
    if (existing?.deleted) {
      return 'deleted';
    }
    if (existing) {
      return {
        id: existing.id,
        subject: existing.subject,
        preferredLanguage: existing.preferredLanguage,
        isAdmin: false,
      };
    }

    const created: StoredUser = {
      id: randomUUID(),
      subject,
      preferredLanguage: null,
      isAdmin: false,
      deleted: false,
    };
    this.usersBySubject.set(subject, created);
    return {
      id: created.id,
      subject: created.subject,
      preferredLanguage: created.preferredLanguage,
      isAdmin: false,
    };
  }

  async listFavorites(userId: string): Promise<FavoriteRecord[]> {
    return [...this.favorites.values()]
      .filter((item) => item.userId === userId)
      .sort((left, right) => {
        const time = right.createdAt.getTime() - left.createdAt.getTime();
        return time !== 0 ? time : right.id.localeCompare(left.id);
      });
  }

  async addFavorite(userId: string, story: PublicStory): Promise<FavoriteRecord> {
    const key = `${userId}:${story.id}`;
    const existing = this.favorites.get(key);
    if (existing) {
      return existing;
    }
    const created: FavoriteRecord = {
      id: randomUUID(),
      userId,
      storyId: story.id,
      createdAt: new Date(),
      story,
    };
    this.favorites.set(key, created);
    return created;
  }

  async removeFavorite(userId: string, storyId: string): Promise<void> {
    this.favorites.delete(`${userId}:${storyId}`);
  }

  async listProgress(userId: string): Promise<ProgressRecord[]> {
    return [...this.progress.values()]
      .filter((item) => item.userId === userId)
      .sort((left, right) => {
        const time = right.lastPlayedAt.getTime() - left.lastPlayedAt.getTime();
        return time !== 0 ? time : right.episodeId.localeCompare(left.episodeId);
      });
  }

  async upsertProgress(
    userId: string,
    episode: PublicEpisode,
    input: { positionSeconds: number; completed: boolean },
  ): Promise<ProgressRecord> {
    const key = `${userId}:${episode.id}`;
    const next: ProgressRecord = {
      userId,
      episodeId: episode.id,
      positionSeconds: input.positionSeconds,
      completed: input.completed,
      lastPlayedAt: new Date(),
      episode,
    };
    this.progress.set(key, next);
    return next;
  }
}
