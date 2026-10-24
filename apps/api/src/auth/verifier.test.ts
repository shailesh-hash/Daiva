import { describe, expect, it } from 'vitest';

import { issueTestAccessToken } from './test-jwt.js';
import {
  createAuthVerifier,
  isDevSessionEnabled,
  loadAuthConfig,
  resolveAuthMode,
} from './verifier.js';

describe('auth configuration', () => {
  it('uses the test verifier outside production unless Cognito is selected', () => {
    expect(resolveAuthMode({ NODE_ENV: 'test' })).toBe('test');
    expect(resolveAuthMode({ NODE_ENV: 'development' })).toBe('test');
    expect(resolveAuthMode({ NODE_ENV: 'production' })).toBe('cognito');
    expect(resolveAuthMode({ AUTH_MODE: 'cognito' })).toBe('cognito');
  });

  it('refuses the test issuer in production', () => {
    expect(() => loadAuthConfig({ NODE_ENV: 'production', AUTH_MODE: 'test' })).toThrow(
      /not allowed in production/,
    );
    expect(isDevSessionEnabled({ NODE_ENV: 'production', AUTH_MODE: 'test' })).toBe(false);
  });

  it('requires Cognito pool and client identifiers', () => {
    expect(() => loadAuthConfig({ AUTH_MODE: 'cognito' })).toThrow(/COGNITO_USER_POOL_ID/);
  });
});

describe('test access tokens', () => {
  const env = {
    NODE_ENV: 'test',
    AUTH_MODE: 'test',
    AUTH_TEST_ISSUER: 'http://127.0.0.1/daiva-test',
    AUTH_TEST_CLIENT_ID: 'daiva-test-client',
    AUTH_TEST_SECRET: 'daiva-vitest-hmac-secret',
  };

  it('accepts a signed access token and rejects expired or foreign tokens', async () => {
    const verifier = createAuthVerifier(env);
    const valid = issueTestAccessToken('user-a', {
      issuer: env.AUTH_TEST_ISSUER,
      clientId: env.AUTH_TEST_CLIENT_ID,
      secret: env.AUTH_TEST_SECRET,
    });
    await expect(verifier.verifyAccessToken(valid.accessToken)).resolves.toEqual({
      subject: 'user-a',
      clientId: env.AUTH_TEST_CLIENT_ID,
      tokenUse: 'access',
    });

    const expired = issueTestAccessToken('user-a', {
      issuer: env.AUTH_TEST_ISSUER,
      clientId: env.AUTH_TEST_CLIENT_ID,
      secret: env.AUTH_TEST_SECRET,
      expiresInSeconds: -20,
    });
    await expect(verifier.verifyAccessToken(expired.accessToken)).rejects.toThrow(/expired/);

    const otherIssuer = issueTestAccessToken('user-a', {
      issuer: 'https://evil.example',
      clientId: env.AUTH_TEST_CLIENT_ID,
      secret: env.AUTH_TEST_SECRET,
    });
    await expect(verifier.verifyAccessToken(otherIssuer.accessToken)).rejects.toThrow();
  });
});
