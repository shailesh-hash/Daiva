import { describe, expect, it, vi } from 'vitest';

import { ApiClient, ApiClientError, isRetryableApiError } from './api-client';

const story = {
  id: '22222222-2222-4222-8222-222222222221',
  universeId: '11111111-1111-4111-8111-111111111111',
  universeSlug: 'guru-daiva-dutta',
  slug: 'the-lamp-at-dusk',
  title: 'The Lamp at Dusk (sample)',
  synopsis: 'Sample',
  language: 'kn',
  categorySlugs: ['devotional'],
  tags: ['kannada'],
  durationSeconds: 270,
  featured: true,
  sortOrder: 1,
  contentNote: 'Sample',
  isSampleContent: true,
  sampleDisclaimer: 'Sample only',
  publicEpisodeCount: 2,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiClient catalogue', () => {
  it('parses a healthy response', async () => {
    const client = new ApiClient('http://localhost:3000', async () =>
      jsonResponse({
        status: 'ok',
        service: 'daiva-api',
        requestId: 'req-1',
      }),
    );

    await expect(client.getHealth()).resolves.toEqual({
      status: 'ok',
      service: 'daiva-api',
      requestId: 'req-1',
    });
  });

  it('lists stories from a catalogue page', async () => {
    const fetchImpl = vi.fn(async (url: URL | RequestInfo) => {
      expect(String(url)).toBe('http://localhost:3000/v1/stories?limit=20');
      return jsonResponse({ data: [story], page: { nextCursor: null } });
    });
    const client = new ApiClient('http://localhost:3000', fetchImpl);

    await expect(client.listStories({ limit: 20 })).resolves.toEqual([story]);
  });

  it('invokes fetch against globalThis so window.fetch is not illegally bound', async () => {
    function windowLikeFetch(this: unknown, input: RequestInfo | URL): Promise<Response> {
      if (this !== globalThis) {
        throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
      }
      expect(String(input)).toBe('http://localhost:3000/v1/universes');
      return Promise.resolve(jsonResponse({ data: [], page: { nextCursor: null } }));
    }

    const client = new ApiClient('http://localhost:3000', windowLikeFetch as typeof fetch);
    await expect(client.listUniverses()).resolves.toEqual([]);
  });

  it('throws a structured error for 404 and 5xx bodies', async () => {
    const client = new ApiClient('http://localhost:3000', async () =>
      jsonResponse(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Story not found',
            requestId: 'req-404',
            details: [],
          },
        },
        404,
      ),
    );

    const error = await client.getStory('missing-story').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      requestId: 'req-404',
      message: 'Story not found',
    });
    expect((error as ApiClientError).isNotFound).toBe(true);
    expect(isRetryableApiError(error)).toBe(false);
  });

  it('sends a bearer token and maps unauthorized errors', async () => {
    const fetchImpl = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer test-token' });
      return jsonResponse(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired access token',
            requestId: 'req-401',
            details: [],
          },
        },
        401,
      );
    });
    const client = new ApiClient('http://localhost:3000', fetchImpl, () => 'test-token');
    const error = await client.getMe().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect((error as ApiClientError).isUnauthorized).toBe(true);
  });

  it('calls admin publish and maps conflict errors', async () => {
    const fetchImpl = vi.fn(async (url: URL | RequestInfo) => {
      expect(String(url)).toBe(
        'http://localhost:3000/v1/admin/episodes/33333333-3333-4333-8333-333333333333/publish',
      );
      return jsonResponse(
        {
          error: {
            code: 'CONFLICT',
            message: 'Episode cannot be published',
            requestId: 'req-409',
            details: ['rights_not_approved'],
          },
        },
        409,
      );
    });
    const client = new ApiClient('http://localhost:3000', fetchImpl, () => 'admin-token');
    const error = await client
      .publishAdminEpisode('33333333-3333-4333-8333-333333333333')
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiClientError);
    expect((error as ApiClientError).isConflict).toBe(true);
  });

  it('retries only non-4xx failures', () => {
    expect(isRetryableApiError(new ApiClientError('failed', 503))).toBe(true);
    expect(isRetryableApiError(new Error('network'))).toBe(true);
    expect(isRetryableApiError(new ApiClientError('bad', 400))).toBe(false);
  });
});
