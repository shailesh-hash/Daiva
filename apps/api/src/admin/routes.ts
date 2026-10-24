import {
  adminAuditListResponseSchema,
  adminEpisodeListResponseSchema,
  adminEpisodeMutationResponseSchema,
  adminIdParamsSchema,
  adminListQuerySchema,
  adminRightsMutationResponseSchema,
  adminStoryListResponseSchema,
  adminStoryMutationResponseSchema,
  adminUniverseListResponseSchema,
  adminUniverseMutationResponseSchema,
  apiErrorSchema,
  createEpisodeBodySchema,
  createMediaBodySchema,
  createRightsBodySchema,
  createStoryBodySchema,
  createUniverseBodySchema,
  patchEpisodeBodySchema,
  patchStoryBodySchema,
  patchUniverseBodySchema,
  reviewEpisodeBodySchema,
  submitReviewBodySchema,
} from '@daiva/domain';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import { z } from 'zod';

import { isLocalAdminReadyEnabled } from '../auth/admin.js';
import type { AuthUser } from '../auth/types.js';
import { ApiHttpError } from '../http/errors.js';
import type { AdminRepository } from './types.js';

const rightsParamsSchema = adminIdParamsSchema.extend({
  rightsId: z.string().uuid(),
});

function requireAdmin(request: { authUser?: AuthUser }): AuthUser {
  if (!request.authUser?.isAdmin) {
    throw new ApiHttpError(403, 'FORBIDDEN', 'Admin access required');
  }
  return request.authUser;
}

export async function registerAdminRoutes(
  app: FastifyInstance,
  admin: AdminRepository,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  const errorResponses = {
    400: apiErrorSchema,
    401: apiErrorSchema,
    403: apiErrorSchema,
    404: apiErrorSchema,
    409: apiErrorSchema,
  };

  typed.get(
    '/v1/admin/universes',
    {
      schema: {
        tags: ['Admin'],
        querystring: adminListQuerySchema,
        response: { 200: adminUniverseListResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      requireAdmin(request);
      const page = await admin.listUniverses(request.query.limit, request.query.cursor);
      return { data: page.data, page: { nextCursor: page.nextCursor } };
    },
  );

  typed.get(
    '/v1/admin/universes/:id',
    {
      schema: {
        tags: ['Admin'],
        params: adminIdParamsSchema,
        response: { 200: adminUniverseMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      requireAdmin(request);
      const universe = await admin.getUniverse(request.params.id);
      if (!universe) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Universe not found');
      }
      return { data: universe };
    },
  );

  typed.post(
    '/v1/admin/universes',
    {
      schema: {
        tags: ['Admin'],
        body: createUniverseBodySchema,
        response: { 200: adminUniverseMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      return { data: await admin.createUniverse(actor, request.body) };
    },
  );

  typed.patch(
    '/v1/admin/universes/:id',
    {
      schema: {
        tags: ['Admin'],
        params: adminIdParamsSchema,
        body: patchUniverseBodySchema,
        response: { 200: adminUniverseMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      const universe = await admin.updateUniverse(actor, request.params.id, request.body);
      if (!universe) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Universe not found');
      }
      return { data: universe };
    },
  );

  typed.get(
    '/v1/admin/stories',
    {
      schema: {
        tags: ['Admin'],
        querystring: adminListQuerySchema,
        response: { 200: adminStoryListResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      requireAdmin(request);
      const page = await admin.listStories(request.query.limit, request.query.cursor);
      return { data: page.data, page: { nextCursor: page.nextCursor } };
    },
  );

  typed.get(
    '/v1/admin/stories/:id',
    {
      schema: {
        tags: ['Admin'],
        params: adminIdParamsSchema,
        response: { 200: adminStoryMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      requireAdmin(request);
      const story = await admin.getStory(request.params.id);
      if (!story) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Story not found');
      }
      return { data: story };
    },
  );

  typed.post(
    '/v1/admin/stories',
    {
      schema: {
        tags: ['Admin'],
        body: createStoryBodySchema,
        response: { 200: adminStoryMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      const story = await admin.createStory(actor, request.body);
      if (story === 'universe_missing') {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Universe not found');
      }
      return { data: story };
    },
  );

  typed.patch(
    '/v1/admin/stories/:id',
    {
      schema: {
        tags: ['Admin'],
        params: adminIdParamsSchema,
        body: patchStoryBodySchema,
        response: { 200: adminStoryMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      const story = await admin.updateStory(actor, request.params.id, request.body);
      if (!story) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Story not found');
      }
      return { data: story };
    },
  );

  typed.get(
    '/v1/admin/episodes',
    {
      schema: {
        tags: ['Admin'],
        querystring: adminListQuerySchema,
        response: { 200: adminEpisodeListResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      requireAdmin(request);
      const page = await admin.listEpisodes(request.query.limit, request.query.cursor);
      return { data: page.data, page: { nextCursor: page.nextCursor } };
    },
  );

  typed.get(
    '/v1/admin/episodes/:id',
    {
      schema: {
        tags: ['Admin'],
        params: adminIdParamsSchema,
        response: { 200: adminEpisodeMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      requireAdmin(request);
      const episode = await admin.getEpisode(request.params.id);
      if (!episode) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Episode not found');
      }
      return { data: episode };
    },
  );

  typed.post(
    '/v1/admin/episodes',
    {
      schema: {
        tags: ['Admin'],
        body: createEpisodeBodySchema,
        response: { 200: adminEpisodeMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      const episode = await admin.createEpisode(actor, request.body);
      if (episode === 'story_missing') {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Story not found');
      }
      return { data: episode };
    },
  );

  typed.patch(
    '/v1/admin/episodes/:id',
    {
      schema: {
        tags: ['Admin'],
        params: adminIdParamsSchema,
        body: patchEpisodeBodySchema,
        response: { 200: adminEpisodeMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      const episode = await admin.updateEpisode(actor, request.params.id, request.body);
      if (!episode) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Episode not found');
      }
      return { data: episode };
    },
  );

  typed.post(
    '/v1/admin/episodes/:id/media',
    {
      schema: {
        tags: ['Admin'],
        params: adminIdParamsSchema,
        body: createMediaBodySchema,
        response: { 200: adminEpisodeMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      const episode = await admin.createMedia(actor, request.params.id, request.body);
      if (!episode) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Episode not found');
      }
      return { data: episode };
    },
  );

  typed.post(
    '/v1/admin/episodes/:id/media/mark-ready',
    {
      schema: {
        tags: ['Admin'],
        params: adminIdParamsSchema,
        response: { 200: adminEpisodeMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      if (!isLocalAdminReadyEnabled(env)) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Not found');
      }
      const episode = await admin.markMediaReady(actor, request.params.id);
      if (!episode) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Episode not found');
      }
      return { data: episode };
    },
  );

  typed.post(
    '/v1/admin/episodes/:id/rights',
    {
      schema: {
        tags: ['Admin'],
        params: adminIdParamsSchema,
        body: createRightsBodySchema,
        response: { 200: adminRightsMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      const rights = await admin.createRights(actor, request.params.id, request.body);
      if (rights === 'media_missing') {
        throw new ApiHttpError(409, 'CONFLICT', 'Attach media before recording rights');
      }
      if (!rights) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Episode not found');
      }
      return { data: rights };
    },
  );

  typed.post(
    '/v1/admin/episodes/:id/rights/:rightsId/approve',
    {
      schema: {
        tags: ['Admin'],
        params: rightsParamsSchema,
        response: { 200: adminRightsMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      const rights = await admin.approveRights(actor, request.params.id, request.params.rightsId);
      if (!rights) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Rights record not found');
      }
      return { data: rights };
    },
  );

  typed.post(
    '/v1/admin/episodes/:id/submit-review',
    {
      schema: {
        tags: ['Admin'],
        params: adminIdParamsSchema,
        body: submitReviewBodySchema,
        response: { 200: adminEpisodeMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      const episode = await admin.submitReview(
        actor,
        request.params.id,
        request.body.notes ?? null,
      );
      if (!episode) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Episode not found');
      }
      return { data: episode };
    },
  );

  typed.post(
    '/v1/admin/episodes/:id/review',
    {
      schema: {
        tags: ['Admin'],
        params: adminIdParamsSchema,
        body: reviewEpisodeBodySchema,
        response: { 200: adminEpisodeMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      const episode = await admin.reviewEpisode(actor, request.params.id, request.body);
      if (!episode) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Episode not found');
      }
      return { data: episode };
    },
  );

  typed.post(
    '/v1/admin/episodes/:id/publish',
    {
      schema: {
        tags: ['Admin'],
        params: adminIdParamsSchema,
        response: { 200: adminEpisodeMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      const episode = await admin.publishEpisode(actor, request.params.id);
      if (!episode) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Episode not found');
      }
      return { data: episode };
    },
  );

  typed.post(
    '/v1/admin/episodes/:id/unpublish',
    {
      schema: {
        tags: ['Admin'],
        params: adminIdParamsSchema,
        response: { 200: adminEpisodeMutationResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      const actor = requireAdmin(request);
      const episode = await admin.unpublishEpisode(actor, request.params.id);
      if (!episode) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Episode not found');
      }
      return { data: episode };
    },
  );

  typed.get(
    '/v1/admin/audit-log',
    {
      schema: {
        tags: ['Admin'],
        querystring: adminListQuerySchema,
        response: { 200: adminAuditListResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      requireAdmin(request);
      const page = await admin.listAudit(request.query.limit, request.query.cursor);
      return { data: page.data, page: { nextCursor: page.nextCursor } };
    },
  );
}
