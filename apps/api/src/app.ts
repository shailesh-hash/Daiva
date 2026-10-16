import cors from '@fastify/cors';
import { healthResponseSchema } from '@daiva/domain';
import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

import { getCorsAllowlist, isAllowedCorsOrigin } from './cors.js';

export async function buildApp(env: NodeJS.ProcessEnv = process.env): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    genReqId: () => randomUUID(),
  });
  const allowedOrigins = getCorsAllowlist(env);

  await app.register(cors, {
    origin: (origin, callback) => {
      callback(null, isAllowedCorsOrigin(origin, allowedOrigins));
    },
  });

  app.get('/health', async (request) => {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'daiva-api',
      requestId: request.id,
    });
  });

  return app;
}
