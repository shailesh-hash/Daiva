import { healthResponseSchema, type HealthResponse } from '@daiva/domain';

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async getHealth(): Promise<HealthResponse> {
    const url = new URL('/health', this.ensureTrailingSlash(this.baseUrl));
    const response = await this.fetchImpl(url);

    if (!response.ok) {
      throw new ApiClientError(
        `Health check failed with status ${response.status}`,
        response.status,
      );
    }

    return healthResponseSchema.parse(await response.json());
  }

  private ensureTrailingSlash(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
  }
}
