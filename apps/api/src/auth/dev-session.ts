import { apiErrorSchema, devSessionBodySchema, devSessionResponseSchema } from '@daiva/domain';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';

import { ApiHttpError } from '../http/errors.js';
import { isDevSessionEnabled, mintTestAccessToken } from './verifier.js';

export async function registerDevSessionRoute(
  app: FastifyInstance,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  if (!isDevSessionEnabled(env)) {
    return;
  }

  const typed = app.withTypeProvider<ZodTypeProvider>();
  typed.post(
    '/v1/dev/sessions',
    {
      schema: {
        tags: ['Development'],
        summary: 'Mint a local test access token. Disabled in production and Cognito mode.',
        body: devSessionBodySchema,
        response: {
          200: devSessionResponseSchema,
          400: apiErrorSchema,
          404: apiErrorSchema,
        },
      },
    },
    async (request) => {
      if (!isDevSessionEnabled(env)) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Not found');
      }
      const minted = mintTestAccessToken(request.body.subject, env);
      return {
        tokenType: 'Bearer' as const,
        accessToken: minted.accessToken,
        expiresIn: minted.expiresIn,
      };
    },
  );
}
