export type VerifiedIdentity = {
  subject: string;
  clientId: string;
  tokenUse: 'access';
};

export type AuthUser = {
  id: string;
  subject: string;
  preferredLanguage: string | null;
  isAdmin: boolean;
};

export interface AuthVerifier {
  verifyAccessToken(token: string): Promise<VerifiedIdentity>;
}

export interface UserDirectory {
  resolveBySubject(subject: string): Promise<AuthUser | 'deleted'>;
}

export const TEST_AUTH_DEFAULTS = {
  issuer: 'http://127.0.0.1/daiva-test',
  clientId: 'daiva-test-client',
  secret: 'daiva-vitest-hmac-secret',
} as const;
