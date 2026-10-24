export function getApiBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
  const parsed = new URL(value);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be an http(s) URL');
  }
  return value.replace(/\/$/, '');
}

export function shouldUseCatalogueFixtures(): boolean {
  return process.env.EXPO_PUBLIC_USE_CATALOGUE_FIXTURES === 'true';
}

export type ClientAuthMode = 'test' | 'cognito';

export function getClientAuthMode(): ClientAuthMode {
  return process.env.EXPO_PUBLIC_AUTH_MODE === 'cognito' ? 'cognito' : 'test';
}

export function getCognitoPublicConfig(): {
  domain: string;
  clientId: string;
  redirectUri: string;
} {
  const domain = process.env.EXPO_PUBLIC_COGNITO_DOMAIN?.trim() ?? '';
  const clientId = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID?.trim() ?? '';
  const redirectUri =
    process.env.EXPO_PUBLIC_COGNITO_REDIRECT_URI?.trim() || 'http://localhost:8081/sign-in';
  if (!domain || !clientId) {
    throw new Error('Cognito public domain and client id are required in Cognito mode');
  }
  return { domain, clientId, redirectUri };
}
