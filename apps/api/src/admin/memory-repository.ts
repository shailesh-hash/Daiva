import {
  paginateItems,
  type AdminAudit,
  type AdminEpisode,
  type AdminRights,
  type AdminReview,
  type AdminStory,
  type AdminUniverse,
  type CreateEpisodeBody,
  type CreateMediaBody,
  type CreateRightsBody,
  type CreateStoryBody,
  type CreateUniverseBody,
  type PatchEpisodeBody,
  type PatchStoryBody,
  type PatchUniverseBody,
  type ReviewEpisodeBody,
} from '@daiva/domain';
import { randomUUID } from 'node:crypto';

import { ApiHttpError } from '../http/errors.js';
import type { CatalogueEpisodeRecord } from '../catalogue/types.js';
import { evaluateAdminPublication } from './evaluation.js';
import type { AdminActor, AdminListResult, AdminRepository } from './types.js';

type StoredMedia = NonNullable<AdminEpisode['media']>;
type StoredEpisode = {
  id: string;
  storyId: string;
  slug: string;
  title: string;
  synopsis: string | null;
  episodeNumber: number;
  language: string;
  durationSeconds: number | null;
  status: AdminEpisode['status'];
  publishedAt: string | null;
  captionsAvailable: boolean;
  isSampleContent: boolean;
  sampleDisclaimer: string | null;
  mediaId: string | null;
};

export class MemoryAdminRepository implements AdminRepository {
  readonly catalogueRows: CatalogueEpisodeRecord[] = [];
  private readonly universes = new Map<string, AdminUniverse>();
  private readonly stories = new Map<string, AdminStory>();
  private readonly episodes = new Map<string, StoredEpisode>();
  private readonly media = new Map<string, StoredMedia>();
  private readonly rights = new Map<string, AdminRights>();
  private readonly reviews = new Map<string, AdminReview>();
  private readonly audit: AdminAudit[] = [];

  private writeAudit(
    actor: AdminActor,
    action: string,
    entityType: string,
    entityId: string,
    details: unknown = null,
  ): void {
    this.audit.push({
      id: randomUUID(),
      actorSubject: actor.subject,
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString(),
    });
  }

  private requireUniqueSlug(kind: 'universe' | 'story', slug: string, ignoreId?: string): void {
    const values = kind === 'universe' ? this.universes.values() : this.stories.values();
    for (const item of values) {
      if (item.slug === slug && item.id !== ignoreId) {
        throw new ApiHttpError(409, 'CONFLICT', `${kind} slug already exists`);
      }
    }
  }

  private toAdminEpisode(episode: StoredEpisode): AdminEpisode {
    const story = this.stories.get(episode.storyId);
    const universe = story ? this.universes.get(story.universeId) : undefined;
    const media = episode.mediaId ? (this.media.get(episode.mediaId) ?? null) : null;
    const rights = [...this.rights.values()].filter((item) => item.mediaAssetId === media?.id);
    const reviews = [...this.reviews.values()]
      .filter((item) => item.episodeId === episode.id)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    const publication = evaluateAdminPublication({
      universeStatus: universe?.status ?? 'DRAFT',
      storyStatus: story?.status ?? 'DRAFT',
      episodeStatus: episode.status,
      hasMediaAsset: Boolean(media),
      mediaProcessingStatus: media?.processingStatus ?? null,
      rights: rights.map((item) => ({
        approvedAt: item.approvedAt,
        approvedBy: item.approvedBy,
        expiresAt: item.expiresAt,
      })),
      reviews,
    });

    return {
      id: episode.id,
      storyId: episode.storyId,
      universeId: story?.universeId ?? '',
      slug: episode.slug,
      title: episode.title,
      synopsis: episode.synopsis,
      episodeNumber: episode.episodeNumber,
      language: episode.language,
      durationSeconds: episode.durationSeconds,
      status: episode.status,
      publishedAt: episode.publishedAt,
      captionsAvailable: episode.captionsAvailable,
      isSampleContent: episode.isSampleContent,
      sampleDisclaimer: episode.sampleDisclaimer,
      media,
      rights,
      reviews,
      publication,
    };
  }

  private syncCatalogue(episodeId: string): void {
    const mapped = this.toAdminEpisode(this.episodes.get(episodeId)!);
    const story = this.stories.get(mapped.storyId);
    const universe = story ? this.universes.get(story.universeId) : undefined;
    if (!story || !universe) {
      return;
    }

    const record: CatalogueEpisodeRecord = {
      id: mapped.id,
      storyId: mapped.storyId,
      slug: mapped.slug,
      title: mapped.title,
      synopsis: mapped.synopsis,
      episodeNumber: mapped.episodeNumber,
      language: mapped.language,
      durationSeconds: mapped.durationSeconds,
      captionsAvailable: mapped.captionsAvailable,
      isSampleContent: mapped.isSampleContent,
      sampleDisclaimer: mapped.sampleDisclaimer,
      status: mapped.status,
      mediaAssetId: mapped.media?.id ?? null,
      story: {
        ...story,
        durationSeconds: null,
        categorySlugs: [],
        tags: [],
        universe,
      },
      media: mapped.media
        ? {
            ...mapped.media,
            rights: mapped.rights.map((item) => ({
              approvedAt: item.approvedAt,
              approvedBy: item.approvedBy,
              expiresAt: item.expiresAt,
            })),
          }
        : null,
      reviews: mapped.reviews.map((item) => ({
        decision: item.decision,
        createdAt: item.createdAt,
      })),
    };

    const index = this.catalogueRows.findIndex((row) => row.id === episodeId);
    if (index >= 0) {
      this.catalogueRows[index] = record;
    } else {
      this.catalogueRows.push(record);
    }
  }

  async listUniverses(limit: number, cursor?: string): Promise<AdminListResult<AdminUniverse>> {
    const items = [...this.universes.values()].sort((left, right) =>
      left.title.localeCompare(right.title),
    );
    const page = paginateItems(items, limit, cursor, 'admin_universe', (item) => ({
      k: item.title,
      i: item.id,
    }));
    return { data: page.data, nextCursor: page.nextCursor };
  }

  async getUniverse(id: string): Promise<AdminUniverse | null> {
    return this.universes.get(id) ?? null;
  }

  async createUniverse(actor: AdminActor, body: CreateUniverseBody): Promise<AdminUniverse> {
    this.requireUniqueSlug('universe', body.slug);
    const created: AdminUniverse = {
      id: randomUUID(),
      slug: body.slug,
      title: body.title,
      description: body.description ?? null,
      primaryLanguage: body.primaryLanguage,
      status: 'DRAFT',
      isSampleContent: body.isSampleContent,
      sampleDisclaimer: body.sampleDisclaimer ?? null,
    };
    this.universes.set(created.id, created);
    this.writeAudit(actor, 'universe.create', 'universe', created.id, { slug: created.slug });
    return created;
  }

  async updateUniverse(
    actor: AdminActor,
    id: string,
    body: PatchUniverseBody,
  ): Promise<AdminUniverse | null> {
    const current = this.universes.get(id);
    if (!current) {
      return null;
    }
    if (body.slug) {
      this.requireUniqueSlug('universe', body.slug, id);
    }
    const next = {
      ...current,
      ...body,
      description: body.description === undefined ? current.description : body.description,
    };
    this.universes.set(id, next);
    for (const episode of this.episodes.values()) {
      if (this.stories.get(episode.storyId)?.universeId === id) {
        this.syncCatalogue(episode.id);
      }
    }
    this.writeAudit(actor, 'universe.update', 'universe', id, body);
    return next;
  }

  async listStories(limit: number, cursor?: string): Promise<AdminListResult<AdminStory>> {
    const items = [...this.stories.values()].sort((left, right) =>
      left.title.localeCompare(right.title),
    );
    const page = paginateItems(items, limit, cursor, 'admin_story', (item) => ({
      k: item.title,
      i: item.id,
    }));
    return { data: page.data, nextCursor: page.nextCursor };
  }

  async getStory(id: string): Promise<AdminStory | null> {
    return this.stories.get(id) ?? null;
  }

  async createStory(
    actor: AdminActor,
    body: CreateStoryBody,
  ): Promise<AdminStory | 'universe_missing'> {
    if (!this.universes.has(body.universeId)) {
      return 'universe_missing';
    }
    this.requireUniqueSlug('story', body.slug);
    const created: AdminStory = {
      id: randomUUID(),
      universeId: body.universeId,
      slug: body.slug,
      title: body.title,
      synopsis: body.synopsis ?? null,
      language: body.language,
      status: 'DRAFT',
      sortOrder: body.sortOrder,
      featured: body.featured,
      contentNote: body.contentNote ?? null,
      isSampleContent: body.isSampleContent,
      sampleDisclaimer: body.sampleDisclaimer ?? null,
    };
    this.stories.set(created.id, created);
    this.writeAudit(actor, 'story.create', 'story', created.id, { slug: created.slug });
    return created;
  }

  async updateStory(
    actor: AdminActor,
    id: string,
    body: PatchStoryBody,
  ): Promise<AdminStory | null> {
    const current = this.stories.get(id);
    if (!current) {
      return null;
    }
    if (body.universeId && !this.universes.has(body.universeId)) {
      throw new ApiHttpError(404, 'NOT_FOUND', 'Universe not found');
    }
    if (body.slug) {
      this.requireUniqueSlug('story', body.slug, id);
    }
    const next = {
      ...current,
      ...body,
      synopsis: body.synopsis === undefined ? current.synopsis : body.synopsis,
    };
    this.stories.set(id, next);
    for (const episode of this.episodes.values()) {
      if (episode.storyId === id) {
        this.syncCatalogue(episode.id);
      }
    }
    this.writeAudit(actor, 'story.update', 'story', id, body);
    return next;
  }

  async listEpisodes(limit: number, cursor?: string): Promise<AdminListResult<AdminEpisode>> {
    const items = [...this.episodes.values()]
      .map((item) => this.toAdminEpisode(item))
      .sort((left, right) => left.title.localeCompare(right.title));
    const page = paginateItems(items, limit, cursor, 'admin_episode', (item) => ({
      k: item.title,
      i: item.id,
    }));
    return { data: page.data, nextCursor: page.nextCursor };
  }

  async getEpisode(id: string): Promise<AdminEpisode | null> {
    const episode = this.episodes.get(id);
    return episode ? this.toAdminEpisode(episode) : null;
  }

  async createEpisode(
    actor: AdminActor,
    body: CreateEpisodeBody,
  ): Promise<AdminEpisode | 'story_missing'> {
    if (!this.stories.has(body.storyId)) {
      return 'story_missing';
    }
    const duplicate = [...this.episodes.values()].some(
      (item) =>
        item.storyId === body.storyId &&
        (item.slug === body.slug || item.episodeNumber === body.episodeNumber),
    );
    if (duplicate) {
      throw new ApiHttpError(
        409,
        'CONFLICT',
        'Episode slug or number already exists on this story',
      );
    }
    const created: StoredEpisode = {
      id: randomUUID(),
      storyId: body.storyId,
      slug: body.slug,
      title: body.title,
      synopsis: body.synopsis ?? null,
      episodeNumber: body.episodeNumber,
      language: body.language,
      durationSeconds: null,
      status: 'DRAFT',
      publishedAt: null,
      captionsAvailable: false,
      isSampleContent: body.isSampleContent,
      sampleDisclaimer: body.sampleDisclaimer ?? null,
      mediaId: null,
    };
    this.episodes.set(created.id, created);
    this.syncCatalogue(created.id);
    this.writeAudit(actor, 'episode.create', 'episode', created.id, { slug: created.slug });
    return this.toAdminEpisode(created);
  }

  async updateEpisode(
    actor: AdminActor,
    id: string,
    body: PatchEpisodeBody,
  ): Promise<AdminEpisode | null> {
    const current = this.episodes.get(id);
    if (!current) {
      return null;
    }
    if (body.status === undefined ? false : (body as { status?: string }).status === 'PUBLISHED') {
      throw new ApiHttpError(400, 'VALIDATION_ERROR', 'Publish episodes through POST /publish');
    }
    const next = {
      ...current,
      ...body,
      synopsis: body.synopsis === undefined ? current.synopsis : body.synopsis,
    };
    this.episodes.set(id, next);
    this.syncCatalogue(id);
    this.writeAudit(actor, 'episode.update', 'episode', id, body);
    return this.toAdminEpisode(next);
  }

  async createMedia(
    actor: AdminActor,
    episodeId: string,
    body: CreateMediaBody,
  ): Promise<AdminEpisode | null> {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      return null;
    }
    const created: StoredMedia = {
      id: randomUUID(),
      processingStatus: 'UPLOADED',
      playbackManifestUrl: body.playbackManifestUrl ?? null,
      posterUrl: body.posterUrl ?? null,
      captionsUrl: body.captionsUrl ?? null,
      durationSeconds: body.durationSeconds ?? null,
    };
    this.media.set(created.id, created);
    episode.mediaId = created.id;
    episode.captionsAvailable = Boolean(created.captionsUrl);
    episode.durationSeconds = created.durationSeconds;
    this.syncCatalogue(episodeId);
    this.writeAudit(actor, 'media.create', 'media', created.id, { episodeId });
    return this.toAdminEpisode(episode);
  }

  async markMediaReady(actor: AdminActor, episodeId: string): Promise<AdminEpisode | null> {
    const episode = this.episodes.get(episodeId);
    if (!episode?.mediaId) {
      return episode ? this.toAdminEpisode(episode) : null;
    }
    const media = this.media.get(episode.mediaId);
    if (!media) {
      return this.toAdminEpisode(episode);
    }
    media.processingStatus = 'READY';
    this.syncCatalogue(episodeId);
    this.writeAudit(actor, 'media.mark_ready', 'media', media.id, { episodeId });
    return this.toAdminEpisode(episode);
  }

  async createRights(
    actor: AdminActor,
    episodeId: string,
    body: CreateRightsBody,
  ): Promise<AdminRights | 'media_missing' | null> {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      return null;
    }
    if (!episode.mediaId) {
      return 'media_missing';
    }
    const created: AdminRights = {
      id: randomUUID(),
      mediaAssetId: episode.mediaId,
      rightsType: body.rightsType,
      sourceDescription: body.sourceDescription,
      evidenceUrl: body.evidenceUrl ?? null,
      territory: body.territory ?? null,
      expiresAt: body.expiresAt ?? null,
      approvedBy: null,
      approvedAt: null,
    };
    this.rights.set(created.id, created);
    this.syncCatalogue(episodeId);
    this.writeAudit(actor, 'rights.create', 'rights', created.id, { episodeId });
    return created;
  }

  async approveRights(
    actor: AdminActor,
    episodeId: string,
    rightsId: string,
  ): Promise<AdminRights | null> {
    const episode = this.episodes.get(episodeId);
    const rights = this.rights.get(rightsId);
    if (!episode || !rights || rights.mediaAssetId !== episode.mediaId) {
      return null;
    }
    rights.approvedBy = actor.subject;
    rights.approvedAt = new Date().toISOString();
    this.syncCatalogue(episodeId);
    this.writeAudit(actor, 'rights.approve', 'rights', rightsId, { episodeId });
    return rights;
  }

  async submitReview(
    actor: AdminActor,
    episodeId: string,
    notes: string | null,
  ): Promise<AdminEpisode | null> {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      return null;
    }
    episode.status = 'IN_REVIEW';
    const review: AdminReview = {
      id: randomUUID(),
      episodeId,
      reviewerId: null,
      decision: 'PENDING',
      notes,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.reviews.set(review.id, review);
    this.syncCatalogue(episodeId);
    this.writeAudit(actor, 'episode.submit_review', 'episode', episodeId, { notes });
    return this.toAdminEpisode(episode);
  }

  async reviewEpisode(
    actor: AdminActor,
    episodeId: string,
    body: ReviewEpisodeBody,
  ): Promise<AdminEpisode | null> {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      return null;
    }
    const review: AdminReview = {
      id: randomUUID(),
      episodeId,
      reviewerId: actor.id,
      decision: body.decision,
      notes: body.notes ?? null,
      reviewedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.reviews.set(review.id, review);
    if (body.decision === 'NEEDS_CHANGES' || body.decision === 'REJECTED') {
      episode.status = 'DRAFT';
    }
    this.syncCatalogue(episodeId);
    this.writeAudit(actor, 'episode.review', 'episode', episodeId, { decision: body.decision });
    return this.toAdminEpisode(episode);
  }

  async publishEpisode(actor: AdminActor, episodeId: string): Promise<AdminEpisode | null> {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      return null;
    }
    const mapped = this.toAdminEpisode(episode);
    if (!mapped.publication.canMarkPublished) {
      throw new ApiHttpError(
        409,
        'CONFLICT',
        'Episode cannot be published until review, rights, and READY media are in place',
        mapped.publication.blockers,
      );
    }
    episode.status = 'PUBLISHED';
    episode.publishedAt = new Date().toISOString();
    this.syncCatalogue(episodeId);
    this.writeAudit(actor, 'episode.publish', 'episode', episodeId, null);
    return this.toAdminEpisode(episode);
  }

  async unpublishEpisode(actor: AdminActor, episodeId: string): Promise<AdminEpisode | null> {
    const episode = this.episodes.get(episodeId);
    if (!episode) {
      return null;
    }
    episode.status = 'UNPUBLISHED';
    this.syncCatalogue(episodeId);
    this.writeAudit(actor, 'episode.unpublish', 'episode', episodeId, null);
    return this.toAdminEpisode(episode);
  }

  async listAudit(limit: number, cursor?: string): Promise<AdminListResult<AdminAudit>> {
    const items = [...this.audit].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
    const page = paginateItems(items, limit, cursor, 'admin_audit', (item) => ({
      k: item.createdAt,
      i: item.id,
    }));
    return { data: page.data, nextCursor: page.nextCursor };
  }
}
