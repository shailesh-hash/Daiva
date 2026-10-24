import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { mintTestAccessToken } from '../auth/verifier.js';
import { buildApp } from '../app.js';
import { MemoryCatalogueRepository } from '../catalogue/memory-repository.js';
import {
  DRAFT_EPISODE_ID,
  HIDDEN_STORY_ID,
  PUBLIC_EPISODE_ID,
  PUBLIC_STORY_ID,
  catalogueTestRecords,
} from '../catalogue/test-records.js';
import { MemoryUserLibraryRepository } from './memory-repository.js';

const env = {
  NODE_ENV: 'test',
  AUTH_MODE: 'test',
  AUTH_TEST_ISSUER: 'http://127.0.0.1/daiva-test',
  AUTH_TEST_CLIENT_ID: 'daiva-test-client',
  AUTH_TEST_SECRET: 'daiva-vitest-hmac-secret',
};

const users = new MemoryUserLibraryRepository();
const app: FastifyInstance = await buildApp(env, {
  catalogue: new MemoryCatalogueRepository(catalogueTestRecords),
  users,
});

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function bearer(subject: string): string {
  return `Bearer ${mintTestAccessToken(subject, env).accessToken}`;
}

function errorCode(response: { json: () => unknown }): string {
  return (response.json() as { error: { code: string } }).error.code;
}

describe('authenticated user routes', () => {
  it('rejects missing, invalid, and expired tokens', async () => {
    const missing = await app.inject({ method: 'GET', url: '/v1/me' });
    expect(missing.statusCode).toBe(401);
    expect(errorCode(missing)).toBe('UNAUTHORIZED');

    const invalid = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: 'Bearer not-a-jwt' },
    });
    expect(invalid.statusCode).toBe(401);

    const expiredToken = (await import('../auth/test-jwt.js')).issueTestAccessToken(
      'user-expired',
      {
        issuer: env.AUTH_TEST_ISSUER,
        clientId: env.AUTH_TEST_CLIENT_ID,
        secret: env.AUTH_TEST_SECRET,
        expiresInSeconds: -5,
      },
    );
    const expiredResponse = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${expiredToken.accessToken}` },
    });
    expect(expiredResponse.statusCode).toBe(401);
  });

  it('does not trust a client-supplied user id', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: `/v1/me/favorites/${PUBLIC_STORY_ID}`,
      headers: { authorization: bearer('user-a') },
      payload: { userId: '00000000-0000-4000-8000-000000000099' },
    });
    expect(response.statusCode).toBe(200);
    const me = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: bearer('user-a') },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().id).not.toBe('00000000-0000-4000-8000-000000000099');
  });

  it('keeps favorites and progress isolated between users', async () => {
    const addA = await app.inject({
      method: 'PUT',
      url: `/v1/me/favorites/${PUBLIC_STORY_ID}`,
      headers: { authorization: bearer('user-a') },
    });
    expect(addA.statusCode).toBe(200);

    const addAgain = await app.inject({
      method: 'PUT',
      url: `/v1/me/favorites/${PUBLIC_STORY_ID}`,
      headers: { authorization: bearer('user-a') },
    });
    expect(addAgain.statusCode).toBe(200);

    const hidden = await app.inject({
      method: 'PUT',
      url: `/v1/me/favorites/${HIDDEN_STORY_ID}`,
      headers: { authorization: bearer('user-a') },
    });
    expect(hidden.statusCode).toBe(404);

    const listB = await app.inject({
      method: 'GET',
      url: '/v1/me/favorites',
      headers: { authorization: bearer('user-b') },
    });
    expect(listB.statusCode).toBe(200);
    expect(listB.json().data).toEqual([]);

    const listA = await app.inject({
      method: 'GET',
      url: '/v1/me/favorites',
      headers: { authorization: bearer('user-a') },
    });
    expect(listA.json().data.map((item: { id: string }) => item.id)).toEqual([PUBLIC_STORY_ID]);

    const progressA = await app.inject({
      method: 'PUT',
      url: `/v1/me/progress/${PUBLIC_EPISODE_ID}`,
      headers: { authorization: bearer('user-a') },
      payload: { positionSeconds: 12, completed: false, userId: 'user-b' },
    });
    expect(progressA.statusCode).toBe(200);

    const draftProgress = await app.inject({
      method: 'PUT',
      url: `/v1/me/progress/${DRAFT_EPISODE_ID}`,
      headers: { authorization: bearer('user-a') },
      payload: { positionSeconds: 5, completed: false },
    });
    expect(draftProgress.statusCode).toBe(404);

    const listProgressB = await app.inject({
      method: 'GET',
      url: '/v1/me/progress',
      headers: { authorization: bearer('user-b') },
    });
    expect(listProgressB.json().data).toEqual([]);

    const listProgressA = await app.inject({
      method: 'GET',
      url: '/v1/me/progress',
      headers: { authorization: bearer('user-a') },
    });
    expect(listProgressA.json().data).toHaveLength(1);
    expect(listProgressA.json().data[0].episodeId).toBe(PUBLIC_EPISODE_ID);
  });

  it('rejects invalid progress and unpublished catalogue access', async () => {
    const negative = await app.inject({
      method: 'PUT',
      url: `/v1/me/progress/${PUBLIC_EPISODE_ID}`,
      headers: { authorization: bearer('user-a') },
      payload: { positionSeconds: -3, completed: false },
    });
    expect(negative.statusCode).toBe(400);
    expect(errorCode(negative)).toBe('VALIDATION_ERROR');
  });

  it('denies admin routes to signed-in viewers and anonymous callers', async () => {
    const anonymous = await app.inject({ method: 'GET', url: '/v1/admin/universes' });
    expect(anonymous.statusCode).toBe(401);

    const viewer = await app.inject({
      method: 'POST',
      url: '/v1/admin/stories',
      headers: { authorization: bearer('user-a') },
      payload: {
        universeId: '11111111-1111-4111-8111-111111111111',
        slug: 'denied',
        title: 'Denied',
      },
    });
    expect(viewer.statusCode).toBe(403);
    expect(errorCode(viewer)).toBe('FORBIDDEN');
  });
});
