import type { FastifyInstance, FastifyRequest } from 'fastify';

import { ApiHttpError } from '../http/errors.js';
import { isAdminSubject } from './admin.js';
import type { AuthUser, AuthVerifier, UserDirectory } from './types.js';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

export function extractBearerToken(authorization: string | undefined): string | undefined {
  if (!authorization) {
    return undefined;
  }
  const match = /^(Bearer) (\S+)$/i.exec(authorization.trim());
  return match?.[2];
}

export async function authenticateRequest(
  request: FastifyRequest,
  verifier: AuthVerifier,
  users: UserDirectory,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AuthUser> {
  const token = extractBearerToken(
    typeof request.headers.authorization === 'string' ? request.headers.authorization : undefined,
  );
  if (!token) {
    throw new ApiHttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  let identity;
  try {
    identity = await verifier.verifyAccessToken(token);
  } catch {
    throw new ApiHttpError(401, 'UNAUTHORIZED', 'Invalid or expired access token');
  }

  const user = await users.resolveBySubject(identity.subject);
  if (user === 'deleted') {
    throw new ApiHttpError(401, 'UNAUTHORIZED', 'Account is not available');
  }
  return {
    ...user,
    isAdmin: isAdminSubject(user.subject, env),
  };
}

export function registerAuthHooks(
  app: FastifyInstance,
  verifier: AuthVerifier,
  users: UserDirectory,
  env: NodeJS.ProcessEnv = process.env,
): void {
  app.decorateRequest('authUser', undefined);
  app.addHook('preHandler', async (request) => {
    if (!request.url.startsWith('/v1/me') && !request.url.startsWith('/v1/admin')) {
      return;
    }
    request.authUser = await authenticateRequest(request, verifier, users, env);
    if (request.url.startsWith('/v1/admin') && !request.authUser.isAdmin) {
      throw new ApiHttpError(403, 'FORBIDDEN', 'Admin access required');
    }
  });
}
