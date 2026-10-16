import { afterEach, describe, expect, it } from 'vitest';

import { getApiBaseUrl } from './config';

describe('getApiBaseUrl', () => {
  const previous = process.env.EXPO_PUBLIC_API_BASE_URL;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_API_BASE_URL = previous;
    }
  });

  it('falls back to the local API when no public env is set', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });

  it('uses the public env when provided', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.test';
    expect(getApiBaseUrl()).toBe('https://api.example.test');
  });
});
