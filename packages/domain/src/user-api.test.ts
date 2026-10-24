import { describe, expect, it } from 'vitest';

import { apiErrorCodeSchema } from './catalogue-api';
import { devSessionBodySchema, upsertProgressBodySchema } from './user-api';

describe('user API schemas', () => {
  it('includes authorization error codes', () => {
    expect(apiErrorCodeSchema.parse('UNAUTHORIZED')).toBe('UNAUTHORIZED');
    expect(apiErrorCodeSchema.parse('FORBIDDEN')).toBe('FORBIDDEN');
    expect(apiErrorCodeSchema.parse('CONFLICT')).toBe('CONFLICT');
  });

  it('rejects negative or unbounded playback positions', () => {
    expect(() =>
      upsertProgressBodySchema.parse({ positionSeconds: -1, completed: false }),
    ).toThrow();
    expect(() =>
      upsertProgressBodySchema.parse({ positionSeconds: 86_401, completed: false }),
    ).toThrow();
    expect(upsertProgressBodySchema.parse({ positionSeconds: 42, completed: false })).toEqual({
      positionSeconds: 42,
      completed: false,
    });
  });

  it('rejects unsafe local identity labels', () => {
    expect(() => devSessionBodySchema.parse({ subject: '' })).toThrow();
    expect(() => devSessionBodySchema.parse({ subject: 'user with spaces' })).toThrow();
    expect(devSessionBodySchema.parse({ subject: 'dev:alice' })).toEqual({ subject: 'dev:alice' });
  });
});
