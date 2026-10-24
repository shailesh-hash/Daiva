import type {
  AdminAudit,
  AdminEpisode,
  AdminRights,
  AdminStory,
  AdminUniverse,
  CreateEpisodeBody,
  CreateMediaBody,
  CreateRightsBody,
  CreateStoryBody,
  CreateUniverseBody,
  PatchEpisodeBody,
  PatchStoryBody,
  PatchUniverseBody,
  ReviewEpisodeBody,
} from '@daiva/domain';

import type { AuthUser } from '../auth/types.js';

export type AdminActor = Pick<AuthUser, 'id' | 'subject'>;

export type AdminListResult<T> = {
  data: T[];
  nextCursor: string | null;
};

export interface AdminRepository {
  listUniverses(limit: number, cursor?: string): Promise<AdminListResult<AdminUniverse>>;
  getUniverse(id: string): Promise<AdminUniverse | null>;
  createUniverse(actor: AdminActor, body: CreateUniverseBody): Promise<AdminUniverse>;
  updateUniverse(
    actor: AdminActor,
    id: string,
    body: PatchUniverseBody,
  ): Promise<AdminUniverse | null>;

  listStories(limit: number, cursor?: string): Promise<AdminListResult<AdminStory>>;
  getStory(id: string): Promise<AdminStory | null>;
  createStory(actor: AdminActor, body: CreateStoryBody): Promise<AdminStory | 'universe_missing'>;
  updateStory(actor: AdminActor, id: string, body: PatchStoryBody): Promise<AdminStory | null>;

  listEpisodes(limit: number, cursor?: string): Promise<AdminListResult<AdminEpisode>>;
  getEpisode(id: string): Promise<AdminEpisode | null>;
  createEpisode(
    actor: AdminActor,
    body: CreateEpisodeBody,
  ): Promise<AdminEpisode | 'story_missing'>;
  updateEpisode(
    actor: AdminActor,
    id: string,
    body: PatchEpisodeBody,
  ): Promise<AdminEpisode | null>;

  createMedia(
    actor: AdminActor,
    episodeId: string,
    body: CreateMediaBody,
  ): Promise<AdminEpisode | null>;
  markMediaReady(actor: AdminActor, episodeId: string): Promise<AdminEpisode | null>;
  createRights(
    actor: AdminActor,
    episodeId: string,
    body: CreateRightsBody,
  ): Promise<AdminRights | 'media_missing' | null>;
  approveRights(
    actor: AdminActor,
    episodeId: string,
    rightsId: string,
  ): Promise<AdminRights | null>;

  submitReview(
    actor: AdminActor,
    episodeId: string,
    notes: string | null,
  ): Promise<AdminEpisode | null>;
  reviewEpisode(
    actor: AdminActor,
    episodeId: string,
    body: ReviewEpisodeBody,
  ): Promise<AdminEpisode | null>;
  publishEpisode(actor: AdminActor, episodeId: string): Promise<AdminEpisode | null>;
  unpublishEpisode(actor: AdminActor, episodeId: string): Promise<AdminEpisode | null>;

  listAudit(limit: number, cursor?: string): Promise<AdminListResult<AdminAudit>>;
}
