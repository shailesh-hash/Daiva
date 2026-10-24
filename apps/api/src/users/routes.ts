import {
  apiErrorSchema,
  favoriteDeleteResponseSchema,
  favoriteListQuerySchema,
  favoriteListResponseSchema,
  favoriteMutationResponseSchema,
  favoriteStoryParamsSchema,
  meUserSchema,
  paginateItems,
  progressEpisodeParamsSchema,
  progressListQuerySchema,
  upsertProgressBodySchema,
  userProgressListResponseSchema,
  userProgressMutationResponseSchema,
  userProgressSchema,
} from '@daiva/domain';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';

import type { CatalogueRepository } from '../catalogue/types.js';
import { ApiHttpError } from '../http/errors.js';
import type { UserLibraryRepository } from './types.js';

function requireUser(request: {
  authUser?: { id: string; preferredLanguage: string | null; isAdmin: boolean };
}) {
  if (!request.authUser) {
    throw new ApiHttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  return request.authUser;
}

function clampPosition(positionSeconds: number, durationSeconds: number | null): number {
  const max = durationSeconds == null ? 86_400 : durationSeconds + 30;
  if (positionSeconds > max) {
    throw new ApiHttpError(400, 'VALIDATION_ERROR', 'Playback position is out of range');
  }
  return positionSeconds;
}

export async function registerUserRoutes(
  app: FastifyInstance,
  catalogue: CatalogueRepository,
  users: UserLibraryRepository,
): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/v1/me',
    {
      schema: {
        tags: ['Account'],
        summary: 'Current authenticated app user',
        response: { 200: meUserSchema, 401: apiErrorSchema },
      },
    },
    async (request) => {
      const user = requireUser(request);
      return { id: user.id, preferredLanguage: user.preferredLanguage, isAdmin: user.isAdmin };
    },
  );

  typed.get(
    '/v1/me/favorites',
    {
      schema: {
        tags: ['Account'],
        summary: 'List the current user favorites that are still public',
        querystring: favoriteListQuerySchema,
        response: { 200: favoriteListResponseSchema, 401: apiErrorSchema },
      },
    },
    async (request) => {
      const user = requireUser(request);
      const records = await users.listFavorites(user.id);
      const stories = [];
      for (const record of records) {
        const story = await catalogue.getPublicStoryById(record.storyId);
        if (story) {
          stories.push(story);
        }
      }
      const page = paginateItems(
        stories,
        request.query.limit,
        request.query.cursor,
        'favorite',
        (item) => ({
          k: item.title,
          i: item.id,
        }),
      );
      return { data: page.data, page: { nextCursor: page.nextCursor } };
    },
  );

  typed.put(
    '/v1/me/favorites/:storyId',
    {
      schema: {
        tags: ['Account'],
        summary: 'Idempotently favorite a published story',
        params: favoriteStoryParamsSchema,
        response: {
          200: favoriteMutationResponseSchema,
          401: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request) => {
      const user = requireUser(request);
      const story = await catalogue.getPublicStoryById(request.params.storyId);
      if (!story) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Story not found');
      }
      await users.addFavorite(user.id, story);
      return { data: story };
    },
  );

  typed.delete(
    '/v1/me/favorites/:storyId',
    {
      schema: {
        tags: ['Account'],
        summary: 'Remove a favorite',
        params: favoriteStoryParamsSchema,
        response: { 200: favoriteDeleteResponseSchema, 401: apiErrorSchema },
      },
    },
    async (request) => {
      const user = requireUser(request);
      await users.removeFavorite(user.id, request.params.storyId);
      return { data: { storyId: request.params.storyId } };
    },
  );

  typed.get(
    '/v1/me/progress',
    {
      schema: {
        tags: ['Account'],
        summary: 'List playback progress for public episodes',
        querystring: progressListQuerySchema,
        response: { 200: userProgressListResponseSchema, 401: apiErrorSchema },
      },
    },
    async (request) => {
      const user = requireUser(request);
      const records = await users.listProgress(user.id);
      const items = [];
      for (const record of records) {
        const episode = await catalogue.getEpisodeById(record.episodeId);
        if (!episode) {
          continue;
        }
        items.push(
          userProgressSchema.parse({
            episodeId: episode.id,
            positionSeconds: record.positionSeconds,
            completed: record.completed,
            lastPlayedAt: record.lastPlayedAt.toISOString(),
            episode,
          }),
        );
      }
      const page = paginateItems(
        items,
        request.query.limit,
        request.query.cursor,
        'progress',
        (item) => ({
          k: item.lastPlayedAt,
          i: item.episodeId,
        }),
      );
      return { data: page.data, page: { nextCursor: page.nextCursor } };
    },
  );

  typed.put(
    '/v1/me/progress/:episodeId',
    {
      schema: {
        tags: ['Account'],
        summary: 'Save playback progress for a public episode',
        params: progressEpisodeParamsSchema,
        body: upsertProgressBodySchema,
        response: {
          200: userProgressMutationResponseSchema,
          400: apiErrorSchema,
          401: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request) => {
      const user = requireUser(request);
      const episode = await catalogue.getEpisodeById(request.params.episodeId);
      if (!episode) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Episode not found');
      }
      const positionSeconds = clampPosition(request.body.positionSeconds, episode.durationSeconds);
      const record = await users.upsertProgress(user.id, episode, {
        positionSeconds,
        completed: request.body.completed,
      });
      return {
        data: userProgressSchema.parse({
          episodeId: episode.id,
          positionSeconds: record.positionSeconds,
          completed: record.completed,
          lastPlayedAt: record.lastPlayedAt.toISOString(),
          episode,
        }),
      };
    },
  );
}
