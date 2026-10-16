import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DEV_CORS_ORIGINS,
  getCorsAllowlist,
  isAllowedCorsOrigin,
  parseCorsOrigins,
} from './cors.js';

describe('parseCorsOrigins', () => {
  it('splits a comma-separated list and trims entries', () => {
    expect(parseCorsOrigins(' https://daiva.example, http://127.0.0.1:4173 ')).toEqual([
      'https://daiva.example',
      'http://127.0.0.1:4173',
    ]);
  });
});

describe('getCorsAllowlist', () => {
  it('uses the local development allowlist outside production', () => {
    expect(getCorsAllowlist({ NODE_ENV: 'development' })).toEqual([...DEFAULT_DEV_CORS_ORIGINS]);
  });

  it('does not fall back to localhost in production', () => {
    expect(getCorsAllowlist({ NODE_ENV: 'production' })).toEqual([]);
    expect(
      getCorsAllowlist({
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://app.daiva.example',
      }),
    ).toEqual(['https://app.daiva.example']);
  });
});

describe('isAllowedCorsOrigin', () => {
  const allowed = getCorsAllowlist({ NODE_ENV: 'development' });

  it('allows missing Origin for non-browser clients', () => {
    expect(isAllowedCorsOrigin(undefined, allowed)).toBe(true);
  });

  it('allows an explicit local Expo origin', () => {
    expect(isAllowedCorsOrigin('http://localhost:8081', allowed)).toBe(true);
  });

  it('rejects an unknown origin', () => {
    expect(isAllowedCorsOrigin('https://evil.example', allowed)).toBe(false);
    expect(isAllowedCorsOrigin('http://localhost:9999', allowed)).toBe(false);
  });
});
