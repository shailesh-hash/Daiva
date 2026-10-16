import { describe, expect, it } from 'vitest';

import { ApiClient, ApiClientError } from './api-client';

describe('ApiClient', () => {
  it('parses a healthy response', async () => {
    const client = new ApiClient(
      'http://localhost:3000',
      async () =>
        new Response(
          JSON.stringify({
            status: 'ok',
            service: 'daiva-api',
            requestId: 'req-1',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );

    await expect(client.getHealth()).resolves.toEqual({
      status: 'ok',
      service: 'daiva-api',
      requestId: 'req-1',
    });
  });

  it('throws when the API returns an error status', async () => {
    const client = new ApiClient(
      'http://localhost:3000',
      async () => new Response('nope', { status: 503 }),
    );

    await expect(client.getHealth()).rejects.toBeInstanceOf(ApiClientError);
  });
});
