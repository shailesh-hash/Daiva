import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { encodeCursor } from '@daiva/domain';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../app.js';
import { MemoryCatalogueRepository } from './memory-repository.js';
import {
  DRAFT_EPISODE_ID,
  DRAFT_STORY_SLUG,
  NOT_READY_EPISODE_ID,
  PUBLIC_EPISODE_ID,
  PUBLIC_STORY_SLUG,
  PUBLIC_UNIVERSE_SLUG,
  UNAPPROVED_RIGHTS_EPISODE_ID,
  catalogueTestRecords,
} from './test-records.js';

const app: FastifyInstance = await buildApp(
  { NODE_ENV: 'test' },
  { catalogue: new MemoryCatalogueRepository(catalogueTestRecords) },
);

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function errorBody(response: { json: () => unknown }) {
  return response.json() as {
    error: { code: string; message: string; requestId: string; details: unknown[] };
  };
}

describe('GET /v1/universes', () => {
  it('lists only published universes that have public READY episodes', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/universes' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.map((item: { slug: string }) => item.slug)).toEqual([PUBLIC_UNIVERSE_SLUG]);
    expect(body.page.nextCursor).toBeNull();
  });

  it('returns an empty page when no universe matches the language filter', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/universes?language=xx' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [], page: { nextCursor: null } });
  });

  it('rejects an invalid limit', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/universes?limit=0' });
    expect(response.statusCode).toBe(400);
    expect(errorBody(response).error.code).toBe('VALIDATION_ERROR');
    expect(errorBody(response).error.requestId).toEqual(expect.any(String));
  });
});

describe('GET /v1/universes/:slug', () => {
  it('returns a published universe and hides drafts', async () => {
    const found = await app.inject({ method: 'GET', url: `/v1/universes/${PUBLIC_UNIVERSE_SLUG}` });
    expect(found.statusCode).toBe(200);
    expect(found.json().slug).toBe(PUBLIC_UNIVERSE_SLUG);

    const missing = await app.inject({ method: 'GET', url: '/v1/universes/does-not-exist' });
    expect(missing.statusCode).toBe(404);
    expect(errorBody(missing).error.code).toBe('NOT_FOUND');
  });

  it('rejects a malformed slug', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/universes/Not%20A%20Slug' });
    expect(response.statusCode).toBe(400);
    expect(errorBody(response).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /v1/stories', () => {
  it('paginates published stories and never returns drafts', async () => {
    const first = await app.inject({ method: 'GET', url: '/v1/stories?limit=2' });
    expect(first.statusCode).toBe(200);
    const firstBody = first.json();
    expect(firstBody.data.map((item: { slug: string }) => item.slug)).toEqual([
      'the-lamp-at-dusk',
      'the-river-crossing',
    ]);
    expect(firstBody.page.nextCursor).toEqual(expect.any(String));
    expect(JSON.stringify(firstBody)).not.toContain('unpublished-editorial-draft');

    const second = await app.inject({
      method: 'GET',
      url: `/v1/stories?limit=2&cursor=${encodeURIComponent(firstBody.page.nextCursor)}`,
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().data.map((item: { slug: string }) => item.slug)).toEqual([
      'the-drum-of-the-grove',
    ]);
    expect(second.json().page.nextCursor).toBeNull();
  });

  it('returns an empty page for an unknown category', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/stories?category=missing-category',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [], page: { nextCursor: null } });
  });

  it('rejects a cursor from another collection', async () => {
    const cursor = encodeCursor({ t: 'universe', k: 'a', i: 'b' });
    const response = await app.inject({ method: 'GET', url: `/v1/stories?cursor=${cursor}` });
    expect(response.statusCode).toBe(400);
    expect(errorBody(response).error.code).toBe('VALIDATION_ERROR');
    expect(errorBody(response).error.message).toBe('Invalid cursor');
  });
});

describe('GET /v1/stories/:slug and episodes', () => {
  it('returns a published story and its READY episodes only', async () => {
    const story = await app.inject({ method: 'GET', url: `/v1/stories/${PUBLIC_STORY_SLUG}` });
    expect(story.statusCode).toBe(200);
    expect(story.json().publicEpisodeCount).toBe(2);

    const episodes = await app.inject({
      method: 'GET',
      url: `/v1/stories/${PUBLIC_STORY_SLUG}/episodes`,
    });
    expect(episodes.statusCode).toBe(200);
    const slugs = episodes.json().data.map((item: { slug: string }) => item.slug);
    expect(slugs).toEqual(['lighting-the-first-lamp', 'neighbors-at-the-door']);
    expect(slugs).not.toContain('processing-media');
    expect(slugs).not.toContain('unapproved-rights');
    expect(slugs).not.toContain('pending-review');
  });

  it('hides draft stories as not found', async () => {
    const story = await app.inject({ method: 'GET', url: `/v1/stories/${DRAFT_STORY_SLUG}` });
    expect(story.statusCode).toBe(404);

    const episodes = await app.inject({
      method: 'GET',
      url: `/v1/stories/${DRAFT_STORY_SLUG}/episodes`,
    });
    expect(episodes.statusCode).toBe(404);
  });
});

describe('GET /v1/episodes/:episodeId', () => {
  it('returns READY media metadata without internal object keys', async () => {
    const response = await app.inject({ method: 'GET', url: `/v1/episodes/${PUBLIC_EPISODE_ID}` });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.media.playbackManifestUrl).toContain('master.m3u8');
    expect(JSON.stringify(body)).not.toContain('sourceObjectKey');
    expect(JSON.stringify(body)).not.toContain('PROCESSING');
  });

  it('does not expose draft, not-ready, or unapproved episodes', async () => {
    for (const id of [DRAFT_EPISODE_ID, NOT_READY_EPISODE_ID, UNAPPROVED_RIGHTS_EPISODE_ID]) {
      const response = await app.inject({ method: 'GET', url: `/v1/episodes/${id}` });
      expect(response.statusCode).toBe(404);
      expect(errorBody(response).error.code).toBe('NOT_FOUND');
    }
  });

  it('rejects an invalid episode id', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/episodes/not-a-uuid' });
    expect(response.statusCode).toBe(400);
    expect(errorBody(response).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /v1/search', () => {
  it('finds published titles and omits draft matches', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/search?q=lamp' });
    expect(response.statusCode).toBe(200);
    const titles = response
      .json()
      .data.map((hit: { type: string; story?: { title: string }; episode?: { title: string } }) =>
        hit.type === 'story' ? hit.story?.title : hit.episode?.title,
      );
    expect(titles).toContain('The Lamp at Dusk');
    expect(titles).toContain('Lighting the First Lamp');
    expect(JSON.stringify(response.json())).not.toContain('Hidden draft');
  });

  it('returns an empty page when nothing matches', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/search?q=zzzz-no-match' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [], page: { nextCursor: null } });
  });

  it('rejects a missing query', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/search' });
    expect(response.statusCode).toBe(400);
    expect(errorBody(response).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('OpenAPI', () => {
  it('publishes the catalogue paths', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/openapi.json' });
    expect(response.statusCode).toBe(200);
    const document = response.json() as { paths: Record<string, unknown> };
    expect(document.paths['/v1/universes']).toBeDefined();
    expect(document.paths['/v1/stories/{slug}']).toBeDefined();
    expect(document.paths['/v1/stories/{storySlug}/episodes']).toBeDefined();
    expect(document.paths['/v1/episodes/{episodeId}']).toBeDefined();
    expect(document.paths['/v1/search']).toBeDefined();
  });
});
