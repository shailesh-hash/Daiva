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

import { ApiHttpError } from '../http/errors.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { evaluateAdminPublication } from './evaluation.js';
import type { AdminActor, AdminListResult, AdminRepository } from './types.js';

const episodeInclude = {
  story: { include: { universe: true } },
  currentMedia: { include: { rights: true } },
  reviews: true,
} as const;

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function mapUniverse(row: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  primaryLanguage: string;
  status: AdminUniverse['status'];
  isSampleContent: boolean;
  sampleDisclaimer: string | null;
}): AdminUniverse {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    primaryLanguage: row.primaryLanguage,
    status: row.status,
    isSampleContent: row.isSampleContent,
    sampleDisclaimer: row.sampleDisclaimer,
  };
}

function mapStory(row: {
  id: string;
  universeId: string;
  slug: string;
  title: string;
  synopsis: string | null;
  language: string;
  status: AdminStory['status'];
  sortOrder: number;
  featured: boolean;
  contentNote: string | null;
  isSampleContent: boolean;
  sampleDisclaimer: string | null;
}): AdminStory {
  return {
    id: row.id,
    universeId: row.universeId,
    slug: row.slug,
    title: row.title,
    synopsis: row.synopsis,
    language: row.language,
    status: row.status,
    sortOrder: row.sortOrder,
    featured: row.featured,
    contentNote: row.contentNote,
    isSampleContent: row.isSampleContent,
    sampleDisclaimer: row.sampleDisclaimer,
  };
}

function mapRights(row: {
  id: string;
  mediaAssetId: string;
  rightsType: AdminRights['rightsType'];
  sourceDescription: string;
  evidenceUrl: string | null;
  territory: string | null;
  expiresAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
}): AdminRights {
  return {
    id: row.id,
    mediaAssetId: row.mediaAssetId,
    rightsType: row.rightsType,
    sourceDescription: row.sourceDescription,
    evidenceUrl: row.evidenceUrl,
    territory: row.territory,
    expiresAt: toIso(row.expiresAt),
    approvedBy: row.approvedBy,
    approvedAt: toIso(row.approvedAt),
  };
}

function mapReview(row: {
  id: string;
  episodeId: string;
  reviewerId: string | null;
  decision: AdminReview['decision'];
  notes: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}): AdminReview {
  return {
    id: row.id,
    episodeId: row.episodeId,
    reviewerId: row.reviewerId,
    decision: row.decision,
    notes: row.notes,
    reviewedAt: toIso(row.reviewedAt),
    createdAt: row.createdAt.toISOString(),
  };
}

function mapEpisode(row: {
  id: string;
  storyId: string;
  slug: string;
  title: string;
  synopsis: string | null;
  episodeNumber: number;
  language: string;
  durationSeconds: number | null;
  status: AdminEpisode['status'];
  publishedAt: Date | null;
  captionsAvailable: boolean;
  isSampleContent: boolean;
  sampleDisclaimer: string | null;
  story: {
    universeId: string;
    status: AdminStory['status'];
    universe: { status: AdminUniverse['status'] };
  };
  currentMedia: {
    id: string;
    processingStatus: NonNullable<AdminEpisode['media']>['processingStatus'];
    playbackManifestUrl: string | null;
    posterUrl: string | null;
    captionsUrl: string | null;
    durationSeconds: number | null;
    rights: Parameters<typeof mapRights>[0][];
  } | null;
  reviews: Parameters<typeof mapReview>[0][];
}): AdminEpisode {
  const rights = row.currentMedia?.rights.map(mapRights) ?? [];
  const reviews = row.reviews.map(mapReview);
  const media = row.currentMedia
    ? {
        id: row.currentMedia.id,
        processingStatus: row.currentMedia.processingStatus,
        playbackManifestUrl: row.currentMedia.playbackManifestUrl,
        posterUrl: row.currentMedia.posterUrl,
        captionsUrl: row.currentMedia.captionsUrl,
        durationSeconds: row.currentMedia.durationSeconds,
      }
    : null;

  return {
    id: row.id,
    storyId: row.storyId,
    universeId: row.story.universeId,
    slug: row.slug,
    title: row.title,
    synopsis: row.synopsis,
    episodeNumber: row.episodeNumber,
    language: row.language,
    durationSeconds: row.durationSeconds,
    status: row.status,
    publishedAt: toIso(row.publishedAt),
    captionsAvailable: row.captionsAvailable,
    isSampleContent: row.isSampleContent,
    sampleDisclaimer: row.sampleDisclaimer,
    media,
    rights,
    reviews,
    publication: evaluateAdminPublication({
      universeStatus: row.story.universe.status,
      storyStatus: row.story.status,
      episodeStatus: row.status,
      hasMediaAsset: Boolean(media),
      mediaProcessingStatus: media?.processingStatus ?? null,
      rights,
      reviews,
    }),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

export class PrismaAdminRepository implements AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async writeAudit(
    actor: AdminActor,
    action: string,
    entityType: string,
    entityId: string,
    details: unknown = null,
  ): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        actorSubject: actor.subject,
        action,
        entityType,
        entityId,
        details: details === null ? undefined : (details as object),
      },
    });
  }

  private async loadEpisode(id: string): Promise<AdminEpisode | null> {
    const row = await this.prisma.episode.findUnique({
      where: { id },
      include: episodeInclude,
    });
    return row ? mapEpisode(row) : null;
  }

  async listUniverses(limit: number, cursor?: string): Promise<AdminListResult<AdminUniverse>> {
    const rows = await this.prisma.storyUniverse.findMany({
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
    });
    const page = paginateItems(rows.map(mapUniverse), limit, cursor, 'admin_universe', (item) => ({
      k: item.title,
      i: item.id,
    }));
    return { data: page.data, nextCursor: page.nextCursor };
  }

  async getUniverse(id: string): Promise<AdminUniverse | null> {
    const row = await this.prisma.storyUniverse.findUnique({ where: { id } });
    return row ? mapUniverse(row) : null;
  }

  async createUniverse(actor: AdminActor, body: CreateUniverseBody): Promise<AdminUniverse> {
    try {
      const row = await this.prisma.storyUniverse.create({
        data: {
          slug: body.slug,
          title: body.title,
          description: body.description ?? null,
          primaryLanguage: body.primaryLanguage,
          isSampleContent: body.isSampleContent,
          sampleDisclaimer: body.sampleDisclaimer ?? null,
        },
      });
      await this.writeAudit(actor, 'universe.create', 'universe', row.id, { slug: row.slug });
      return mapUniverse(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiHttpError(409, 'CONFLICT', 'universe slug already exists');
      }
      throw error;
    }
  }

  async updateUniverse(
    actor: AdminActor,
    id: string,
    body: PatchUniverseBody,
  ): Promise<AdminUniverse | null> {
    const existing = await this.prisma.storyUniverse.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }
    try {
      const row = await this.prisma.storyUniverse.update({
        where: { id },
        data: {
          slug: body.slug,
          title: body.title,
          description: body.description,
          primaryLanguage: body.primaryLanguage,
          status: body.status,
          isSampleContent: body.isSampleContent,
          sampleDisclaimer: body.sampleDisclaimer,
        },
      });
      await this.writeAudit(actor, 'universe.update', 'universe', id, body);
      return mapUniverse(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiHttpError(409, 'CONFLICT', 'universe slug already exists');
      }
      throw error;
    }
  }

  async listStories(limit: number, cursor?: string): Promise<AdminListResult<AdminStory>> {
    const rows = await this.prisma.story.findMany({
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
    });
    const page = paginateItems(rows.map(mapStory), limit, cursor, 'admin_story', (item) => ({
      k: item.title,
      i: item.id,
    }));
    return { data: page.data, nextCursor: page.nextCursor };
  }

  async getStory(id: string): Promise<AdminStory | null> {
    const row = await this.prisma.story.findUnique({ where: { id } });
    return row ? mapStory(row) : null;
  }

  async createStory(
    actor: AdminActor,
    body: CreateStoryBody,
  ): Promise<AdminStory | 'universe_missing'> {
    const universe = await this.prisma.storyUniverse.findUnique({ where: { id: body.universeId } });
    if (!universe) {
      return 'universe_missing';
    }
    try {
      const row = await this.prisma.story.create({
        data: {
          universeId: body.universeId,
          slug: body.slug,
          title: body.title,
          synopsis: body.synopsis ?? null,
          language: body.language,
          sortOrder: body.sortOrder,
          featured: body.featured,
          contentNote: body.contentNote ?? null,
          isSampleContent: body.isSampleContent,
          sampleDisclaimer: body.sampleDisclaimer ?? null,
        },
      });
      await this.writeAudit(actor, 'story.create', 'story', row.id, { slug: row.slug });
      return mapStory(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiHttpError(409, 'CONFLICT', 'story slug already exists');
      }
      throw error;
    }
  }

  async updateStory(
    actor: AdminActor,
    id: string,
    body: PatchStoryBody,
  ): Promise<AdminStory | null> {
    const existing = await this.prisma.story.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }
    if (body.universeId) {
      const universe = await this.prisma.storyUniverse.findUnique({
        where: { id: body.universeId },
      });
      if (!universe) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Universe not found');
      }
    }
    try {
      const row = await this.prisma.story.update({
        where: { id },
        data: {
          universeId: body.universeId,
          slug: body.slug,
          title: body.title,
          synopsis: body.synopsis,
          language: body.language,
          status: body.status,
          sortOrder: body.sortOrder,
          featured: body.featured,
          contentNote: body.contentNote,
          isSampleContent: body.isSampleContent,
          sampleDisclaimer: body.sampleDisclaimer,
        },
      });
      await this.writeAudit(actor, 'story.update', 'story', id, body);
      return mapStory(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiHttpError(409, 'CONFLICT', 'story slug already exists');
      }
      throw error;
    }
  }

  async listEpisodes(limit: number, cursor?: string): Promise<AdminListResult<AdminEpisode>> {
    const rows = await this.prisma.episode.findMany({
      include: episodeInclude,
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
    });
    const page = paginateItems(rows.map(mapEpisode), limit, cursor, 'admin_episode', (item) => ({
      k: item.title,
      i: item.id,
    }));
    return { data: page.data, nextCursor: page.nextCursor };
  }

  async getEpisode(id: string): Promise<AdminEpisode | null> {
    return this.loadEpisode(id);
  }

  async createEpisode(
    actor: AdminActor,
    body: CreateEpisodeBody,
  ): Promise<AdminEpisode | 'story_missing'> {
    const story = await this.prisma.story.findUnique({ where: { id: body.storyId } });
    if (!story) {
      return 'story_missing';
    }
    try {
      const row = await this.prisma.episode.create({
        data: {
          storyId: body.storyId,
          slug: body.slug,
          title: body.title,
          synopsis: body.synopsis ?? null,
          episodeNumber: body.episodeNumber,
          language: body.language,
          isSampleContent: body.isSampleContent,
          sampleDisclaimer: body.sampleDisclaimer ?? null,
        },
        include: episodeInclude,
      });
      await this.writeAudit(actor, 'episode.create', 'episode', row.id, { slug: row.slug });
      return mapEpisode(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiHttpError(
          409,
          'CONFLICT',
          'Episode slug or number already exists on this story',
        );
      }
      throw error;
    }
  }

  async updateEpisode(
    actor: AdminActor,
    id: string,
    body: PatchEpisodeBody,
  ): Promise<AdminEpisode | null> {
    const existing = await this.prisma.episode.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }
    try {
      const row = await this.prisma.episode.update({
        where: { id },
        data: {
          slug: body.slug,
          title: body.title,
          synopsis: body.synopsis,
          episodeNumber: body.episodeNumber,
          language: body.language,
          status: body.status,
          isSampleContent: body.isSampleContent,
          sampleDisclaimer: body.sampleDisclaimer,
        },
        include: episodeInclude,
      });
      await this.writeAudit(actor, 'episode.update', 'episode', id, body);
      return mapEpisode(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiHttpError(
          409,
          'CONFLICT',
          'Episode slug or number already exists on this story',
        );
      }
      throw error;
    }
  }

  async createMedia(
    actor: AdminActor,
    episodeId: string,
    body: CreateMediaBody,
  ): Promise<AdminEpisode | null> {
    const existing = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!existing) {
      return null;
    }
    const media = await this.prisma.mediaAsset.create({
      data: {
        episodeId,
        processingStatus: 'UPLOADED',
        playbackManifestUrl: body.playbackManifestUrl ?? null,
        posterUrl: body.posterUrl ?? null,
        captionsUrl: body.captionsUrl ?? null,
        durationSeconds: body.durationSeconds ?? null,
      },
    });
    await this.prisma.episode.update({
      where: { id: episodeId },
      data: {
        mediaAssetId: media.id,
        captionsAvailable: Boolean(media.captionsUrl),
        durationSeconds: media.durationSeconds,
      },
    });
    await this.writeAudit(actor, 'media.create', 'media', media.id, { episodeId });
    return this.loadEpisode(episodeId);
  }

  async markMediaReady(actor: AdminActor, episodeId: string): Promise<AdminEpisode | null> {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) {
      return null;
    }
    if (episode.mediaAssetId) {
      await this.prisma.mediaAsset.update({
        where: { id: episode.mediaAssetId },
        data: { processingStatus: 'READY' },
      });
      await this.writeAudit(actor, 'media.mark_ready', 'media', episode.mediaAssetId, {
        episodeId,
      });
    }
    return this.loadEpisode(episodeId);
  }

  async createRights(
    actor: AdminActor,
    episodeId: string,
    body: CreateRightsBody,
  ): Promise<AdminRights | 'media_missing' | null> {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) {
      return null;
    }
    if (!episode.mediaAssetId) {
      return 'media_missing';
    }
    const row = await this.prisma.contentRights.create({
      data: {
        mediaAssetId: episode.mediaAssetId,
        rightsType: body.rightsType,
        sourceDescription: body.sourceDescription,
        evidenceUrl: body.evidenceUrl ?? null,
        territory: body.territory ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });
    await this.writeAudit(actor, 'rights.create', 'rights', row.id, { episodeId });
    return mapRights(row);
  }

  async approveRights(
    actor: AdminActor,
    episodeId: string,
    rightsId: string,
  ): Promise<AdminRights | null> {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    const rights = await this.prisma.contentRights.findUnique({ where: { id: rightsId } });
    if (!episode || !rights || rights.mediaAssetId !== episode.mediaAssetId) {
      return null;
    }
    const row = await this.prisma.contentRights.update({
      where: { id: rightsId },
      data: {
        approvedBy: actor.subject,
        approvedAt: new Date(),
      },
    });
    await this.writeAudit(actor, 'rights.approve', 'rights', rightsId, { episodeId });
    return mapRights(row);
  }

  async submitReview(
    actor: AdminActor,
    episodeId: string,
    notes: string | null,
  ): Promise<AdminEpisode | null> {
    const existing = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!existing) {
      return null;
    }
    await this.prisma.$transaction([
      this.prisma.episode.update({
        where: { id: episodeId },
        data: { status: 'IN_REVIEW' },
      }),
      this.prisma.contentReview.create({
        data: {
          episodeId,
          decision: 'PENDING',
          notes,
        },
      }),
    ]);
    await this.writeAudit(actor, 'episode.submit_review', 'episode', episodeId, { notes });
    return this.loadEpisode(episodeId);
  }

  async reviewEpisode(
    actor: AdminActor,
    episodeId: string,
    body: ReviewEpisodeBody,
  ): Promise<AdminEpisode | null> {
    const existing = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!existing) {
      return null;
    }
    await this.prisma.contentReview.create({
      data: {
        episodeId,
        reviewerId: actor.id,
        decision: body.decision,
        notes: body.notes ?? null,
        reviewedAt: new Date(),
      },
    });
    if (body.decision === 'NEEDS_CHANGES' || body.decision === 'REJECTED') {
      await this.prisma.episode.update({
        where: { id: episodeId },
        data: { status: 'DRAFT' },
      });
    }
    await this.writeAudit(actor, 'episode.review', 'episode', episodeId, {
      decision: body.decision,
    });
    return this.loadEpisode(episodeId);
  }

  async publishEpisode(actor: AdminActor, episodeId: string): Promise<AdminEpisode | null> {
    const mapped = await this.loadEpisode(episodeId);
    if (!mapped) {
      return null;
    }
    if (!mapped.publication.canMarkPublished) {
      throw new ApiHttpError(
        409,
        'CONFLICT',
        'Episode cannot be published until review, rights, and READY media are in place',
        mapped.publication.blockers,
      );
    }
    await this.prisma.episode.update({
      where: { id: episodeId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    await this.writeAudit(actor, 'episode.publish', 'episode', episodeId, null);
    return this.loadEpisode(episodeId);
  }

  async unpublishEpisode(actor: AdminActor, episodeId: string): Promise<AdminEpisode | null> {
    const existing = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!existing) {
      return null;
    }
    await this.prisma.episode.update({
      where: { id: episodeId },
      data: { status: 'UNPUBLISHED' },
    });
    await this.writeAudit(actor, 'episode.unpublish', 'episode', episodeId, null);
    return this.loadEpisode(episodeId);
  }

  async listAudit(limit: number, cursor?: string): Promise<AdminListResult<AdminAudit>> {
    const rows = await this.prisma.adminAuditLog.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const items = rows.map((row) => ({
      id: row.id,
      actorSubject: row.actorSubject,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      details: row.details,
      createdAt: row.createdAt.toISOString(),
    }));
    const page = paginateItems(items, limit, cursor, 'admin_audit', (item) => ({
      k: item.createdAt,
      i: item.id,
    }));
    return { data: page.data, nextCursor: page.nextCursor };
  }
}
