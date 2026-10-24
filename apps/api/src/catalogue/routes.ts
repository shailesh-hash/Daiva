import {
  apiErrorSchema,
  episodeIdParamsSchema,
  episodeListQuerySchema,
  publicEpisodeListResponseSchema,
  publicEpisodeSchema,
  publicStoryListResponseSchema,
  publicStorySchema,
  publicUniverseListResponseSchema,
  publicUniverseSchema,
  searchQuerySchema,
  searchResponseSchema,
  slugParamsSchema,
  storyListQuerySchema,
  storySlugParamsSchema,
  universeListQuerySchema,
} from '@daiva/domain';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';

import { ApiHttpError } from '../http/errors.js';
import type { CatalogueRepository } from './types.js';

export async function registerCatalogueRoutes(
  app: FastifyInstance,
  catalogue: CatalogueRepository,
): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/v1/universes',
    {
      schema: {
        tags: ['Catalogue'],
        summary: 'List published universes that have ready public episodes',
        querystring: universeListQuerySchema,
        response: {
          200: publicUniverseListResponseSchema,
          400: apiErrorSchema,
        },
      },
    },
    async (request) => catalogue.listUniverses(request.query),
  );

  typed.get(
    '/v1/universes/:slug',
    {
      schema: {
        tags: ['Catalogue'],
        summary: 'Get a published universe by slug',
        params: slugParamsSchema,
        response: {
          200: publicUniverseSchema,
          400: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request) => {
      const universe = await catalogue.getUniverseBySlug(request.params.slug);
      if (!universe) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Universe not found');
      }
      return universe;
    },
  );

  typed.get(
    '/v1/stories',
    {
      schema: {
        tags: ['Catalogue'],
        summary: 'List published stories that have ready public episodes',
        querystring: storyListQuerySchema,
        response: {
          200: publicStoryListResponseSchema,
          400: apiErrorSchema,
        },
      },
    },
    async (request) => catalogue.listStories(request.query),
  );

  typed.get(
    '/v1/stories/:slug',
    {
      schema: {
        tags: ['Catalogue'],
        summary: 'Get a published story by slug',
        params: slugParamsSchema,
        response: {
          200: publicStorySchema,
          400: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request) => {
      const story = await catalogue.getStoryBySlug(request.params.slug);
      if (!story) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Story not found');
      }
      return story;
    },
  );

  typed.get(
    '/v1/stories/:storySlug/episodes',
    {
      schema: {
        tags: ['Catalogue'],
        summary: 'List published episodes with READY media for a story',
        params: storySlugParamsSchema,
        querystring: episodeListQuerySchema,
        response: {
          200: publicEpisodeListResponseSchema,
          400: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request) => {
      const result = await catalogue.listEpisodes(request.params.storySlug, request.query);
      if (result === 'story_not_found') {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Story not found');
      }
      return result;
    },
  );

  typed.get(
    '/v1/episodes/:episodeId',
    {
      schema: {
        tags: ['Catalogue'],
        summary: 'Get a published episode and READY media metadata',
        params: episodeIdParamsSchema,
        response: {
          200: publicEpisodeSchema,
          400: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request) => {
      const episode = await catalogue.getEpisodeById(request.params.episodeId);
      if (!episode) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Episode not found');
      }
      return episode;
    },
  );

  typed.get(
    '/v1/search',
    {
      schema: {
        tags: ['Catalogue'],
        summary: 'Search published stories and episodes with READY media',
        querystring: searchQuerySchema,
        response: {
          200: searchResponseSchema,
          400: apiErrorSchema,
        },
      },
    },
    async (request) => catalogue.search(request.query),
  );
}
