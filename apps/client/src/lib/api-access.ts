import { ApiClient } from '@daiva/api-client';

import { getApiBaseUrl } from './config';

let accessToken: string | undefined;

export function setAccessToken(token: string | undefined): void {
  accessToken = token;
}

export function getAccessToken(): string | undefined {
  return accessToken;
}

let client: ApiClient | undefined;

export function getApiClient(): ApiClient {
  client ??= new ApiClient(getApiBaseUrl(), fetch, getAccessToken);
  return client;
}
