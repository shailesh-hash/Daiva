import {
  adminAuditListResponseSchema,
  adminEpisodeListResponseSchema,
  adminEpisodeMutationResponseSchema,
  adminRightsMutationResponseSchema,
  adminStoryListResponseSchema,
  adminStoryMutationResponseSchema,
  adminUniverseListResponseSchema,
  adminUniverseMutationResponseSchema,
  apiErrorSchema,
  devSessionResponseSchema,
  favoriteListResponseSchema,
  favoriteMutationResponseSchema,
  healthResponseSchema,
  meUserSchema,
  publicEpisodeListResponseSchema,
  publicEpisodeSchema,
  publicStoryListResponseSchema,
  publicStorySchema,
  publicUniverseListResponseSchema,
  publicUniverseSchema,
  searchResponseSchema,
  userProgressListResponseSchema,
  userProgressMutationResponseSchema,
  type AdminAudit,
  type AdminEpisode,
  type AdminRights,
  type AdminStory,
  type AdminUniverse,
  type CreateEpisodeBody,
  type CreateMediaBody,
  type CreateRightsBody,
  type CreateStoryBody,
  type CreateUniverseBody,
  type DevSessionResponse,
  type MeUser,
  type PatchEpisodeBody,
  type PatchStoryBody,
  type PatchUniverseBody,
  type PublicEpisode,
  type PublicStory,
  type PublicUniverse,
  type ReviewEpisodeBody,
  type SearchHit,
  type StoryListQuery,
  type UniverseListQuery,
  type UserProgress,
} from '@daiva/domain';

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }
}

export type CatalogueListQuery = {
  language?: string;
  limit?: number;
  cursor?: string;
};

export type CatalogueStoryListQuery = CatalogueListQuery & {
  universe?: string;
  category?: string;
};

export type CatalogueSearchQuery = CatalogueListQuery & {
  q: string;
};

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly getAccessToken?: () => string | undefined | Promise<string | undefined>,
  ) {}

  async getHealth() {
    const response = await this.request('/health');
    return healthResponseSchema.parse(await response.json());
  }

  async listUniverses(query: CatalogueListQuery = {}): Promise<PublicUniverse[]> {
    const response = await this.request('/v1/universes', query);
    return publicUniverseListResponseSchema.parse(await response.json()).data;
  }

  async getUniverse(slug: string): Promise<PublicUniverse> {
    const response = await this.request(`/v1/universes/${encodeURIComponent(slug)}`);
    return publicUniverseSchema.parse(await response.json());
  }

  async listStories(query: CatalogueStoryListQuery = {}): Promise<PublicStory[]> {
    const response = await this.request('/v1/stories', query);
    return publicStoryListResponseSchema.parse(await response.json()).data;
  }

  async getStory(slug: string): Promise<PublicStory> {
    const response = await this.request(`/v1/stories/${encodeURIComponent(slug)}`);
    return publicStorySchema.parse(await response.json());
  }

  async listStoryEpisodes(
    storySlug: string,
    query: CatalogueListQuery = {},
  ): Promise<PublicEpisode[]> {
    const response = await this.request(
      `/v1/stories/${encodeURIComponent(storySlug)}/episodes`,
      query,
    );
    return publicEpisodeListResponseSchema.parse(await response.json()).data;
  }

  async getEpisode(episodeId: string): Promise<PublicEpisode> {
    const response = await this.request(`/v1/episodes/${encodeURIComponent(episodeId)}`);
    return publicEpisodeSchema.parse(await response.json());
  }

  async search(query: CatalogueSearchQuery): Promise<SearchHit[]> {
    const response = await this.request('/v1/search', query);
    return searchResponseSchema.parse(await response.json()).data;
  }

  async getMe(): Promise<MeUser> {
    const response = await this.request('/v1/me');
    return meUserSchema.parse(await response.json());
  }

  async listFavorites(): Promise<PublicStory[]> {
    const response = await this.request('/v1/me/favorites', { limit: 50 });
    return favoriteListResponseSchema.parse(await response.json()).data;
  }

  async addFavorite(storyId: string): Promise<PublicStory> {
    const response = await this.request(
      `/v1/me/favorites/${encodeURIComponent(storyId)}`,
      {},
      { method: 'PUT' },
    );
    return favoriteMutationResponseSchema.parse(await response.json()).data;
  }

  async removeFavorite(storyId: string): Promise<void> {
    await this.request(`/v1/me/favorites/${encodeURIComponent(storyId)}`, {}, { method: 'DELETE' });
  }

  async listProgress(): Promise<UserProgress[]> {
    const response = await this.request('/v1/me/progress', { limit: 50 });
    return userProgressListResponseSchema.parse(await response.json()).data;
  }

  async saveProgress(
    episodeId: string,
    body: { positionSeconds: number; completed: boolean },
  ): Promise<UserProgress> {
    const response = await this.request(
      `/v1/me/progress/${encodeURIComponent(episodeId)}`,
      {},
      { method: 'PUT', body },
    );
    return userProgressMutationResponseSchema.parse(await response.json()).data;
  }

  async listAdminUniverses(): Promise<AdminUniverse[]> {
    const response = await this.request('/v1/admin/universes', { limit: 50 });
    return adminUniverseListResponseSchema.parse(await response.json()).data;
  }

  async getAdminUniverse(id: string): Promise<AdminUniverse> {
    const response = await this.request(`/v1/admin/universes/${encodeURIComponent(id)}`);
    return adminUniverseMutationResponseSchema.parse(await response.json()).data;
  }

  async createAdminUniverse(body: CreateUniverseBody): Promise<AdminUniverse> {
    const response = await this.request('/v1/admin/universes', {}, { method: 'POST', body });
    return adminUniverseMutationResponseSchema.parse(await response.json()).data;
  }

  async updateAdminUniverse(id: string, body: PatchUniverseBody): Promise<AdminUniverse> {
    const response = await this.request(
      `/v1/admin/universes/${encodeURIComponent(id)}`,
      {},
      { method: 'PATCH', body },
    );
    return adminUniverseMutationResponseSchema.parse(await response.json()).data;
  }

  async listAdminStories(): Promise<AdminStory[]> {
    const response = await this.request('/v1/admin/stories', { limit: 50 });
    return adminStoryListResponseSchema.parse(await response.json()).data;
  }

  async getAdminStory(id: string): Promise<AdminStory> {
    const response = await this.request(`/v1/admin/stories/${encodeURIComponent(id)}`);
    return adminStoryMutationResponseSchema.parse(await response.json()).data;
  }

  async createAdminStory(body: CreateStoryBody): Promise<AdminStory> {
    const response = await this.request('/v1/admin/stories', {}, { method: 'POST', body });
    return adminStoryMutationResponseSchema.parse(await response.json()).data;
  }

  async updateAdminStory(id: string, body: PatchStoryBody): Promise<AdminStory> {
    const response = await this.request(
      `/v1/admin/stories/${encodeURIComponent(id)}`,
      {},
      { method: 'PATCH', body },
    );
    return adminStoryMutationResponseSchema.parse(await response.json()).data;
  }

  async listAdminEpisodes(): Promise<AdminEpisode[]> {
    const response = await this.request('/v1/admin/episodes', { limit: 50 });
    return adminEpisodeListResponseSchema.parse(await response.json()).data;
  }

  async getAdminEpisode(id: string): Promise<AdminEpisode> {
    const response = await this.request(`/v1/admin/episodes/${encodeURIComponent(id)}`);
    return adminEpisodeMutationResponseSchema.parse(await response.json()).data;
  }

  async createAdminEpisode(body: CreateEpisodeBody): Promise<AdminEpisode> {
    const response = await this.request('/v1/admin/episodes', {}, { method: 'POST', body });
    return adminEpisodeMutationResponseSchema.parse(await response.json()).data;
  }

  async updateAdminEpisode(id: string, body: PatchEpisodeBody): Promise<AdminEpisode> {
    const response = await this.request(
      `/v1/admin/episodes/${encodeURIComponent(id)}`,
      {},
      { method: 'PATCH', body },
    );
    return adminEpisodeMutationResponseSchema.parse(await response.json()).data;
  }

  async createAdminEpisodeMedia(episodeId: string, body: CreateMediaBody): Promise<AdminEpisode> {
    const response = await this.request(
      `/v1/admin/episodes/${encodeURIComponent(episodeId)}/media`,
      {},
      { method: 'POST', body },
    );
    return adminEpisodeMutationResponseSchema.parse(await response.json()).data;
  }

  async markAdminEpisodeMediaReady(episodeId: string): Promise<AdminEpisode> {
    const response = await this.request(
      `/v1/admin/episodes/${encodeURIComponent(episodeId)}/media/mark-ready`,
      {},
      { method: 'POST' },
    );
    return adminEpisodeMutationResponseSchema.parse(await response.json()).data;
  }

  async createAdminEpisodeRights(episodeId: string, body: CreateRightsBody): Promise<AdminRights> {
    const response = await this.request(
      `/v1/admin/episodes/${encodeURIComponent(episodeId)}/rights`,
      {},
      { method: 'POST', body },
    );
    return adminRightsMutationResponseSchema.parse(await response.json()).data;
  }

  async approveAdminEpisodeRights(episodeId: string, rightsId: string): Promise<AdminRights> {
    const response = await this.request(
      `/v1/admin/episodes/${encodeURIComponent(episodeId)}/rights/${encodeURIComponent(rightsId)}/approve`,
      {},
      { method: 'POST' },
    );
    return adminRightsMutationResponseSchema.parse(await response.json()).data;
  }

  async submitAdminEpisodeReview(episodeId: string, notes?: string): Promise<AdminEpisode> {
    const response = await this.request(
      `/v1/admin/episodes/${encodeURIComponent(episodeId)}/submit-review`,
      {},
      { method: 'POST', body: { notes: notes ?? null } },
    );
    return adminEpisodeMutationResponseSchema.parse(await response.json()).data;
  }

  async reviewAdminEpisode(episodeId: string, body: ReviewEpisodeBody): Promise<AdminEpisode> {
    const response = await this.request(
      `/v1/admin/episodes/${encodeURIComponent(episodeId)}/review`,
      {},
      { method: 'POST', body },
    );
    return adminEpisodeMutationResponseSchema.parse(await response.json()).data;
  }

  async publishAdminEpisode(episodeId: string): Promise<AdminEpisode> {
    const response = await this.request(
      `/v1/admin/episodes/${encodeURIComponent(episodeId)}/publish`,
      {},
      { method: 'POST' },
    );
    return adminEpisodeMutationResponseSchema.parse(await response.json()).data;
  }

  async unpublishAdminEpisode(episodeId: string): Promise<AdminEpisode> {
    const response = await this.request(
      `/v1/admin/episodes/${encodeURIComponent(episodeId)}/unpublish`,
      {},
      { method: 'POST' },
    );
    return adminEpisodeMutationResponseSchema.parse(await response.json()).data;
  }

  async listAdminAudit(): Promise<AdminAudit[]> {
    const response = await this.request('/v1/admin/audit-log', { limit: 50 });
    return adminAuditListResponseSchema.parse(await response.json()).data;
  }

  async createDevSession(subject: string): Promise<DevSessionResponse> {
    const response = await this.request(
      '/v1/dev/sessions',
      {},
      { method: 'POST', body: { subject } },
    );
    return devSessionResponseSchema.parse(await response.json());
  }

  private async request(
    path: string,
    query: Record<string, string | number | undefined> = {},
    init: { method?: string; body?: unknown } = {},
  ): Promise<Response> {
    const url = this.buildUrl(path, query).toString();
    const headers: Record<string, string> = {};
    const token = await this.getAccessToken?.();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (init.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await this.fetchImpl.call(globalThis, url, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

    if (response.status === 204) {
      return response;
    }

    if (response.ok) {
      return response;
    }

    let code: string | undefined;
    let requestId: string | undefined;
    let message = `Request failed with status ${response.status}`;

    try {
      const parsed = apiErrorSchema.safeParse(await response.json());
      if (parsed.success) {
        code = parsed.data.error.code;
        requestId = parsed.data.error.requestId;
        message = parsed.data.error.message;
      }
    } catch {
      // Keep the status message when the body is not a structured API error.
    }

    throw new ApiClientError(message, response.status, code, requestId);
  }

  private buildUrl(path: string, query: Record<string, string | number | undefined>): URL {
    const url = new URL(path, `${this.baseUrl.replace(/\/$/, '')}/`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    return url;
  }
}

export function isRetryableApiError(error: unknown): boolean {
  return !(error instanceof ApiClientError && error.status >= 400 && error.status < 500);
}

export type {
  AdminEpisode,
  AdminStory,
  AdminUniverse,
  DevSessionResponse,
  MeUser,
  PublicEpisode,
  PublicStory,
  PublicUniverse,
  SearchHit,
  StoryListQuery,
  UniverseListQuery,
  UserProgress,
};
