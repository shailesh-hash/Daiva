import { describe, expect, it } from 'vitest';

import { healthResponseSchema } from './health';

describe('healthResponseSchema', () => {
  it('accepts a valid health payload', () => {
    const result = healthResponseSchema.parse({
      status: 'ok',
      service: 'daiva-api',
      requestId: 'req-1',
    });

    expect(result.status).toBe('ok');
  });

  it('rejects an unhealthy payload', () => {
    expect(() =>
      healthResponseSchema.parse({
        status: 'down',
        service: 'daiva-api',
        requestId: 'req-1',
      }),
    ).toThrow();
  });
});
