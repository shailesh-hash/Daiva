import { createHmac, timingSafeEqual } from 'node:crypto';

import type { VerifiedIdentity } from './types.js';

type TestJwtClaims = {
  sub: string;
  iss: string;
  client_id: string;
  token_use: 'access';
  iat: number;
  exp: number;
};

function encodeSegment(value: object | Buffer): string {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value));
  return bytes.toString('base64url');
}

function sign(input: string, secret: string): string {
  return createHmac('sha256', secret).update(input).digest('base64url');
}

export function issueTestAccessToken(
  subject: string,
  options: { issuer: string; clientId: string; secret: string; expiresInSeconds?: number },
): { accessToken: string; expiresIn: number } {
  const expiresIn = options.expiresInSeconds ?? 3600;
  const now = Math.floor(Date.now() / 1000);
  const payload: TestJwtClaims = {
    sub: subject,
    iss: options.issuer,
    client_id: options.clientId,
    token_use: 'access',
    iat: now,
    exp: now + expiresIn,
  };
  const header = encodeSegment({ alg: 'HS256', typ: 'JWT' });
  const body = encodeSegment(payload);
  const signingInput = `${header}.${body}`;
  return {
    accessToken: `${signingInput}.${sign(signingInput, options.secret)}`,
    expiresIn,
  };
}

export function verifyTestAccessToken(
  token: string,
  options: { issuer: string; clientId: string; secret: string },
): VerifiedIdentity {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error('invalid_token');
  }

  const signingInput = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(signingInput, options.secret));
  const actual = Buffer.from(parts[2]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('invalid_signature');
  }

  let claims: TestJwtClaims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as TestJwtClaims;
  } catch {
    throw new Error('invalid_payload');
  }

  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== options.issuer || claims.client_id !== options.clientId) {
    throw new Error('invalid_audience');
  }
  if (claims.token_use !== 'access' || typeof claims.sub !== 'string' || claims.sub.length === 0) {
    throw new Error('invalid_claims');
  }
  if (typeof claims.exp !== 'number' || claims.exp <= now) {
    throw new Error('token_expired');
  }

  return {
    subject: claims.sub,
    clientId: claims.client_id,
    tokenUse: 'access',
  };
}
