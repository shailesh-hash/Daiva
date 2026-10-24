import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from './app.js';

const app = await buildApp();

afterAll(async () => {
  await app.close();
});

describe('GET /health', () => {
  it('returns a valid health payload', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'daiva-api',
      requestId: expect.any(String),
    });
  });

  it('allows a listed local origin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:8081' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8081');
  });

  it('does not reflect an unknown origin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('production CORS', () => {
  it('does not allow local Expo origins unless listed in CORS_ORIGINS', async () => {
    const prodApp = await buildApp({
      NODE_ENV: 'production',
      AUTH_MODE: 'cognito',
      COGNITO_USER_POOL_ID: 'us-east-1_ExamplePool',
      COGNITO_CLIENT_ID: 'exampleclientid',
    });

    try {
      const response = await prodApp.inject({
        method: 'GET',
        url: '/health',
        headers: { origin: 'http://localhost:8081' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      await prodApp.close();
    }
  });
});
