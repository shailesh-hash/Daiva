import type { PublicEpisode, PublicStory } from '@daiva/domain';

import type { AuthUser } from '../auth/types.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import type { FavoriteRecord, ProgressRecord, UserLibraryRepository } from './types.js';

export class PrismaUserLibraryRepository implements UserLibraryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async resolveBySubject(subject: string): Promise<AuthUser | 'deleted'> {
    const existing = await this.prisma.appUser.findUnique({
      where: { authSubject: subject },
    });
    if (existing?.deletedAt) {
      return 'deleted';
    }
    if (existing) {
      return {
        id: existing.id,
        subject: existing.authSubject,
        preferredLanguage: existing.preferredLanguage,
        isAdmin: false,
      };
    }

    try {
      const created = await this.prisma.appUser.create({
        data: { authSubject: subject },
      });
      return {
        id: created.id,
        subject: created.authSubject,
        preferredLanguage: created.preferredLanguage,
        isAdmin: false,
      };
    } catch {
      const raced = await this.prisma.appUser.findUnique({
        where: { authSubject: subject },
      });
      if (!raced || raced.deletedAt) {
        return 'deleted';
      }
      return {
        id: raced.id,
        subject: raced.authSubject,
        preferredLanguage: raced.preferredLanguage,
        isAdmin: false,
      };
    }
  }

  async listFavorites(userId: string): Promise<FavoriteRecord[]> {
    const rows = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      storyId: row.storyId,
      createdAt: row.createdAt,
      story: { id: row.storyId } as PublicStory,
    }));
  }

  async addFavorite(userId: string, story: PublicStory): Promise<FavoriteRecord> {
    const row = await this.prisma.favorite.upsert({
      where: { userId_storyId: { userId, storyId: story.id } },
      create: { userId, storyId: story.id },
      update: {},
    });
    return {
      id: row.id,
      userId: row.userId,
      storyId: row.storyId,
      createdAt: row.createdAt,
      story,
    };
  }

  async removeFavorite(userId: string, storyId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({
      where: { userId, storyId },
    });
  }

  async listProgress(userId: string): Promise<ProgressRecord[]> {
    const rows = await this.prisma.playbackProgress.findMany({
      where: { userId },
      orderBy: [{ lastPlayedAt: 'desc' }, { episodeId: 'desc' }],
    });
    return rows.map((row) => ({
      userId: row.userId,
      episodeId: row.episodeId,
      positionSeconds: row.positionSeconds,
      completed: row.completed,
      lastPlayedAt: row.lastPlayedAt,
      episode: { id: row.episodeId } as PublicEpisode,
    }));
  }

  async upsertProgress(
    userId: string,
    episode: PublicEpisode,
    input: { positionSeconds: number; completed: boolean },
  ): Promise<ProgressRecord> {
    const row = await this.prisma.playbackProgress.upsert({
      where: { userId_episodeId: { userId, episodeId: episode.id } },
      create: {
        userId,
        episodeId: episode.id,
        positionSeconds: input.positionSeconds,
        completed: input.completed,
      },
      update: {
        positionSeconds: input.positionSeconds,
        completed: input.completed,
        lastPlayedAt: new Date(),
      },
    });
    return {
      userId: row.userId,
      episodeId: row.episodeId,
      positionSeconds: row.positionSeconds,
      completed: row.completed,
      lastPlayedAt: row.lastPlayedAt,
      episode,
    };
  }
}
