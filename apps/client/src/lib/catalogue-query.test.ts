import { ApiClientError } from '@daiva/api-client';
import { describe, expect, it } from 'vitest';

import { shouldRetryQuery } from './query-client';

describe('catalogue query retries', () => {
  it('does not retry client errors', () => {
    expect(shouldRetryQuery(0, new ApiClientError('Story not found', 404, 'NOT_FOUND'))).toBe(
      false,
    );
    expect(shouldRetryQuery(0, new ApiClientError('Invalid', 400, 'VALIDATION_ERROR'))).toBe(false);
  });

  it('retries a transient failure once', () => {
    expect(shouldRetryQuery(0, new ApiClientError('down', 503))).toBe(true);
    expect(shouldRetryQuery(1, new ApiClientError('down', 503))).toBe(false);
    expect(shouldRetryQuery(0, new Error('network'))).toBe(true);
  });
});
