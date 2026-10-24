import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { mintTestAccessToken } from '../auth/verifier.js';
import { buildApp } from '../app.js';

const env = {
  NODE_ENV: 'test',
  AUTH_MODE: 'test',
  AUTH_TEST_ISSUER: 'http://127.0.0.1/daiva-test',
  AUTH_TEST_CLIENT_ID: 'daiva-test-client',
  AUTH_TEST_SECRET: 'daiva-vitest-hmac-secret',
  ADMIN_SUBJECTS: 'dev:admin',
};

const episodeId = '11111111-1111-4111-8111-111111111111';
const mediaId = '22222222-2222-4222-8222-222222222222';

const app: FastifyInstance = await buildApp(env);

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

function bearer(subject: string): string {
  return `Bearer ${mintTestAccessToken(subject, env).accessToken}`;
}

describe('admin media upload routes', () => {
  it('are unregistered until AWS media environment is fully configured', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/v1/admin/episodes/${episodeId}/media/${mediaId}/upload-url`,
      headers: { authorization: bearer('dev:admin') },
      payload: { contentType: 'video/mp4', fileName: 'clip.mp4' },
    });
    expect(response.statusCode).toBe(404);
  });
});

describe('admin media upload configuration', () => {
  it('refuses to start with a partial media environment', async () => {
    await expect(
      buildApp({
        ...env,
        AWS_REGION: 'ap-south-1',
        MEDIA_SOURCE_BUCKET: 'daiva-source-test',
      }),
    ).rejects.toThrow(/incomplete/);
  });

  it('requires CDN_DOMAIN with the rest of the media settings', async () => {
    await expect(
      buildApp({
        ...env,
        AWS_REGION: 'ap-south-1',
        MEDIA_SOURCE_BUCKET: 'daiva-source-test',
        MEDIA_OUTPUT_BUCKET: 'daiva-output-test',
        MEDIACONVERT_ENDPOINT: 'https://mediaconvert.ap-south-1.amazonaws.com',
        MEDIACONVERT_ROLE_ARN: 'arn:aws:iam::123456789012:role/DaivaMediaConvertRole',
      }),
    ).rejects.toThrow(/incomplete/);
  });
});
