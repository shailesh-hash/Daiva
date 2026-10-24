import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { mintTestAccessToken } from '../auth/verifier.js';
import { buildApp } from '../app.js';
import { MemoryCatalogueRepository } from '../catalogue/memory-repository.js';
import { MemoryAdminRepository } from './memory-repository.js';

const env = {
  NODE_ENV: 'test',
  AUTH_MODE: 'test',
  AUTH_TEST_ISSUER: 'http://127.0.0.1/daiva-test',
  AUTH_TEST_CLIENT_ID: 'daiva-test-client',
  AUTH_TEST_SECRET: 'daiva-vitest-hmac-secret',
  ADMIN_SUBJECTS: 'dev:admin',
};

const adminStore = new MemoryAdminRepository();
const app: FastifyInstance = await buildApp(env, {
  catalogue: new MemoryCatalogueRepository(adminStore.catalogueRows),
  admin: adminStore,
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

function blockers(response: { json: () => unknown }): string[] {
  return (response.json() as { error: { details: string[] } }).error.details;
}

async function adminJson<T>(
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  payload?: Record<string, unknown>,
): Promise<{ status: number; body: T }> {
  const response = await app.inject({
    method,
    url,
    headers: { authorization: bearer('dev:admin') },
    ...(payload ? { payload } : {}),
  });
  return { status: response.statusCode, body: response.json() as T };
}

describe('admin authorization', () => {
  it('rejects anonymous and non-admin callers', async () => {
    const anonymous = await app.inject({
      method: 'POST',
      url: '/v1/admin/universes',
      payload: { slug: 'denied', title: 'Denied' },
    });
    expect(anonymous.statusCode).toBe(401);

    const viewer = await app.inject({
      method: 'POST',
      url: '/v1/admin/universes',
      headers: { authorization: bearer('user-a') },
      payload: { slug: 'denied', title: 'Denied' },
    });
    expect(viewer.statusCode).toBe(403);
    expect(errorCode(viewer)).toBe('FORBIDDEN');
  });

  it('does not trust a client-supplied admin role', async () => {
    const me = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: bearer('user-a') },
      payload: { isAdmin: true, role: 'admin' },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().isAdmin).toBe(false);
  });
});

describe('admin publishing preconditions', () => {
  it('blocks every missing publish requirement and then succeeds', async () => {
    const universe = await adminJson<{ data: { id: string } }>('POST', '/v1/admin/universes', {
      slug: 'admin-test-universe',
      title: 'Admin Test Universe',
      primaryLanguage: 'kn',
    });
    expect(universe.status).toBe(200);
    const universeId = universe.body.data.id;

    const story = await adminJson<{ data: { id: string } }>('POST', '/v1/admin/stories', {
      universeId,
      slug: 'admin-test-story',
      title: 'Admin Test Story',
    });
    expect(story.status).toBe(200);
    const storyId = story.body.data.id;

    const episode = await adminJson<{ data: { id: string; publication: { blockers: string[] } } }>(
      'POST',
      '/v1/admin/episodes',
      {
        storyId,
        slug: 'admin-test-episode',
        title: 'Admin Test Episode',
        episodeNumber: 1,
      },
    );
    expect(episode.status).toBe(200);
    const episodeId = episode.body.data.id;
    expect(episode.body.data.publication.blockers).toEqual(
      expect.arrayContaining([
        'universe_not_published',
        'story_not_published',
        'media_missing',
        'rights_not_approved',
        'review_not_approved',
      ]),
    );

    const publishedViaPatch = await app.inject({
      method: 'PATCH',
      url: `/v1/admin/episodes/${episodeId}`,
      headers: { authorization: bearer('dev:admin') },
      payload: { status: 'PUBLISHED' },
    });
    expect(publishedViaPatch.statusCode).toBe(400);

    const firstPublish = await app.inject({
      method: 'POST',
      url: `/v1/admin/episodes/${episodeId}/publish`,
      headers: { authorization: bearer('dev:admin') },
    });
    expect(firstPublish.statusCode).toBe(409);
    expect(errorCode(firstPublish)).toBe('CONFLICT');
    expect(blockers(firstPublish)).toEqual(
      expect.arrayContaining([
        'universe_not_published',
        'story_not_published',
        'media_missing',
        'rights_not_approved',
        'review_not_approved',
      ]),
    );

    await adminJson('PATCH', `/v1/admin/universes/${universeId}`, { status: 'PUBLISHED' });
    await adminJson('PATCH', `/v1/admin/stories/${storyId}`, { status: 'PUBLISHED' });

    const afterParents = await app.inject({
      method: 'POST',
      url: `/v1/admin/episodes/${episodeId}/publish`,
      headers: { authorization: bearer('dev:admin') },
    });
    expect(blockers(afterParents)).toEqual(
      expect.arrayContaining(['media_missing', 'rights_not_approved', 'review_not_approved']),
    );
    expect(blockers(afterParents)).not.toContain('universe_not_published');
    expect(blockers(afterParents)).not.toContain('story_not_published');

    const rejectedReady = await app.inject({
      method: 'POST',
      url: `/v1/admin/episodes/${episodeId}/media`,
      headers: { authorization: bearer('dev:admin') },
      payload: {
        playbackManifestUrl: 'https://cdn.example/episode.m3u8',
        processingStatus: 'READY',
      },
    });
    expect(rejectedReady.statusCode).toBe(400);

    const media = await adminJson<{ data: { media: { processingStatus: string } } }>(
      'POST',
      `/v1/admin/episodes/${episodeId}/media`,
      { playbackManifestUrl: 'https://cdn.example/episode.m3u8', durationSeconds: 90 },
    );
    expect(media.status).toBe(200);
    expect(media.body.data.media.processingStatus).toBe('UPLOADED');

    const unprocessed = await app.inject({
      method: 'POST',
      url: `/v1/admin/episodes/${episodeId}/publish`,
      headers: { authorization: bearer('dev:admin') },
    });
    expect(blockers(unprocessed)).toEqual(
      expect.arrayContaining(['media_not_ready', 'rights_not_approved', 'review_not_approved']),
    );

    await adminJson('POST', `/v1/admin/episodes/${episodeId}/media/mark-ready`);

    const rejectedApproval = await app.inject({
      method: 'POST',
      url: `/v1/admin/episodes/${episodeId}/rights`,
      headers: { authorization: bearer('dev:admin') },
      payload: {
        rightsType: 'ORIGINAL',
        sourceDescription: 'Owned original dramatization',
        approvedBy: 'spoofed-editor',
        approvedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(rejectedApproval.statusCode).toBe(400);

    const rights = await adminJson<{ data: { id: string; approvedBy: string | null } }>(
      'POST',
      `/v1/admin/episodes/${episodeId}/rights`,
      {
        rightsType: 'ORIGINAL',
        sourceDescription: 'Owned original dramatization',
      },
    );
    expect(rights.status).toBe(200);
    expect(rights.body.data.approvedBy).toBeNull();

    const missingRights = await app.inject({
      method: 'POST',
      url: `/v1/admin/episodes/${episodeId}/publish`,
      headers: { authorization: bearer('dev:admin') },
    });
    expect(blockers(missingRights)).toEqual(
      expect.arrayContaining(['rights_not_approved', 'review_not_approved']),
    );

    await adminJson(
      'POST',
      `/v1/admin/episodes/${episodeId}/rights/${rights.body.data.id}/approve`,
    );

    const missingReview = await app.inject({
      method: 'POST',
      url: `/v1/admin/episodes/${episodeId}/publish`,
      headers: { authorization: bearer('dev:admin') },
    });
    expect(blockers(missingReview)).toEqual(['review_not_approved']);

    await adminJson('POST', `/v1/admin/episodes/${episodeId}/submit-review`, {
      notes: 'Ready for editorial review',
    });
    await adminJson('POST', `/v1/admin/episodes/${episodeId}/review`, {
      decision: 'APPROVED',
      notes: 'Sample metadata only',
    });

    const published = await adminJson<{ data: { status: string } }>(
      'POST',
      `/v1/admin/episodes/${episodeId}/publish`,
    );
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe('PUBLISHED');

    const publicEpisode = await app.inject({
      method: 'GET',
      url: `/v1/episodes/${episodeId}`,
    });
    expect(publicEpisode.statusCode).toBe(200);

    const unpublished = await adminJson<{ data: { status: string } }>(
      'POST',
      `/v1/admin/episodes/${episodeId}/unpublish`,
    );
    expect(unpublished.body.data.status).toBe('UNPUBLISHED');

    const hidden = await app.inject({
      method: 'GET',
      url: `/v1/episodes/${episodeId}`,
    });
    expect(hidden.statusCode).toBe(404);

    const audit = await adminJson<{ data: { action: string }[] }>('GET', '/v1/admin/audit-log');
    expect(audit.body.data.map((item) => item.action)).toEqual(
      expect.arrayContaining(['episode.publish', 'episode.unpublish', 'rights.approve']),
    );
  });
});
