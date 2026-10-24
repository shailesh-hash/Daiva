import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from '@fastify/type-provider-zod';
import { healthResponseSchema } from '@daiva/domain';
import Fastify, { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

import { registerAuthHooks } from './auth/plugin.js';
import type { AuthVerifier } from './auth/types.js';
import { createAuthVerifier } from './auth/verifier.js';
import { registerDevSessionRoute } from './auth/dev-session.js';
import { MemoryCatalogueRepository } from './catalogue/memory-repository.js';
import { registerCatalogueRoutes } from './catalogue/routes.js';
import type { CatalogueRepository } from './catalogue/types.js';
import { getCorsAllowlist, isAllowedCorsOrigin } from './cors.js';
import { createApiError, handleApiError } from './http/errors.js';
import { MemoryAdminRepository } from './admin/memory-repository.js';
import { registerAdminRoutes } from './admin/routes.js';
import type { AdminRepository } from './admin/types.js';
import { MemoryUserLibraryRepository } from './users/memory-repository.js';
import { registerUserRoutes } from './users/routes.js';
import type { UserLibraryRepository } from './users/types.js';

export type BuildAppDependencies = {
  catalogue?: CatalogueRepository;
  auth?: AuthVerifier;
  users?: UserLibraryRepository;
  admin?: AdminRepository;
};

export async function buildApp(
  env: NodeJS.ProcessEnv = process.env,
  deps: BuildAppDependencies = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'test'
        ? false
        : {
            level: 'info',
            serializers: {
              req(request) {
                return {
                  id: request.id,
                  method: request.method,
                  url: request.url,
                };
              },
            },
          },
    requestIdHeader: 'x-request-id',
    genReqId: (request) => {
      const incoming = request.headers['x-request-id'];
      if (typeof incoming === 'string' && incoming.trim()) {
        return incoming.trim().slice(0, 80);
      }
      return randomUUID();
    },
    bodyLimit: 16 * 1024,
    connectionTimeout: 10_000,
    requestTimeout: 10_000,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const allowedOrigins = getCorsAllowlist(env);

  await app.register(cors, {
    origin: (origin, callback) => {
      callback(null, isAllowedCorsOrigin(origin, allowedOrigins));
    },
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Daiva Public API',
        description:
          'Public catalogue and authenticated user endpoints. Draft, unpublished, and not-ready media are never returned.',
        version: '0.8.0',
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  const catalogue = deps.catalogue ?? new MemoryCatalogueRepository([]);
  const users = deps.users ?? new MemoryUserLibraryRepository();
  const admin = deps.admin ?? new MemoryAdminRepository();
  const auth = deps.auth ?? createAuthVerifier(env);

  registerAuthHooks(app, auth, users, env);

  app.setErrorHandler(handleApiError);
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send(createApiError(request.id, 'NOT_FOUND', 'Not found'));
  });

  app.get('/health', async (request) => {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'daiva-api',
      requestId: request.id,
    });
  });

  app.get('/v1/openapi.json', async () => app.swagger());

  await registerCatalogueRoutes(app, catalogue);
  await registerUserRoutes(app, catalogue, users);
  await registerDevSessionRoute(app, env);
  await registerAdminRoutes(app, admin, env);

  return app;
}
