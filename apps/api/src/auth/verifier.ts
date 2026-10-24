import { CognitoJwtVerifier } from 'aws-jwt-verify';

import { issueTestAccessToken, verifyTestAccessToken } from './test-jwt.js';
import { TEST_AUTH_DEFAULTS, type AuthVerifier, type VerifiedIdentity } from './types.js';

export type AuthMode = 'cognito' | 'test';

export type TestAuthConfig = {
  mode: 'test';
  issuer: string;
  clientId: string;
  secret: string;
};

export type CognitoAuthConfig = {
  mode: 'cognito';
  userPoolId: string;
  clientId: string;
};

export type AuthConfig = TestAuthConfig | CognitoAuthConfig;

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

export function resolveAuthMode(env: NodeJS.ProcessEnv): AuthMode {
  const configured = env.AUTH_MODE?.trim();
  if (configured === 'cognito' || configured === 'test') {
    return configured;
  }
  if (env.NODE_ENV === 'production') {
    return 'cognito';
  }
  return 'test';
}

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const mode = resolveAuthMode(env);
  if (mode === 'cognito') {
    return {
      mode,
      userPoolId: required(env, 'COGNITO_USER_POOL_ID'),
      clientId: required(env, 'COGNITO_CLIENT_ID'),
    };
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('AUTH_MODE=test is not allowed in production');
  }

  return {
    mode,
    issuer: env.AUTH_TEST_ISSUER?.trim() || TEST_AUTH_DEFAULTS.issuer,
    clientId: env.AUTH_TEST_CLIENT_ID?.trim() || TEST_AUTH_DEFAULTS.clientId,
    secret:
      env.AUTH_TEST_SECRET?.trim() ||
      (env.NODE_ENV === 'test' ? TEST_AUTH_DEFAULTS.secret : TEST_AUTH_DEFAULTS.secret),
  };
}

export function createAuthVerifier(env: NodeJS.ProcessEnv = process.env): AuthVerifier {
  const config = loadAuthConfig(env);
  if (config.mode === 'cognito') {
    const verifier = CognitoJwtVerifier.create({
      userPoolId: config.userPoolId,
      tokenUse: 'access',
      clientId: config.clientId,
    });
    return {
      async verifyAccessToken(token: string): Promise<VerifiedIdentity> {
        const payload = await verifier.verify(token);
        return {
          subject: payload.sub,
          clientId: typeof payload.client_id === 'string' ? payload.client_id : config.clientId,
          tokenUse: 'access',
        };
      },
    };
  }

  return {
    async verifyAccessToken(token: string): Promise<VerifiedIdentity> {
      return verifyTestAccessToken(token, config);
    },
  };
}

export function mintTestAccessToken(
  subject: string,
  env: NodeJS.ProcessEnv = process.env,
): { accessToken: string; expiresIn: number } {
  const config = loadAuthConfig(env);
  if (config.mode !== 'test') {
    throw new Error('Test tokens are only available when AUTH_MODE=test');
  }
  return issueTestAccessToken(subject, {
    issuer: config.issuer,
    clientId: config.clientId,
    secret: config.secret,
  });
}

export function isDevSessionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return resolveAuthMode(env) === 'test' && env.NODE_ENV !== 'production';
}
