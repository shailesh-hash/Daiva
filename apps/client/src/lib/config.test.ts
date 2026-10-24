import { afterEach, describe, expect, it } from 'vitest';

import { getApiBaseUrl, getClientAuthMode, shouldUseCatalogueFixtures } from './config';

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

  it('enables fixture catalogue only when explicitly requested', () => {
    const previous = process.env.EXPO_PUBLIC_USE_CATALOGUE_FIXTURES;
    delete process.env.EXPO_PUBLIC_USE_CATALOGUE_FIXTURES;
    expect(shouldUseCatalogueFixtures()).toBe(false);
    process.env.EXPO_PUBLIC_USE_CATALOGUE_FIXTURES = 'true';
    expect(shouldUseCatalogueFixtures()).toBe(true);
    if (previous === undefined) {
      delete process.env.EXPO_PUBLIC_USE_CATALOGUE_FIXTURES;
    } else {
      process.env.EXPO_PUBLIC_USE_CATALOGUE_FIXTURES = previous;
    }
  });

  it('defaults to local test auth unless Cognito mode is selected', () => {
    const previous = process.env.EXPO_PUBLIC_AUTH_MODE;
    delete process.env.EXPO_PUBLIC_AUTH_MODE;
    expect(getClientAuthMode()).toBe('test');
    process.env.EXPO_PUBLIC_AUTH_MODE = 'cognito';
    expect(getClientAuthMode()).toBe('cognito');
    if (previous === undefined) {
      delete process.env.EXPO_PUBLIC_AUTH_MODE;
    } else {
      process.env.EXPO_PUBLIC_AUTH_MODE = previous;
    }
  });
});
