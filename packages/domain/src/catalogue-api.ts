import { z } from 'zod';

export const apiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INTERNAL_ERROR',
]);

export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().min(1),
    requestId: z.string().min(1),
    details: z.array(z.unknown()).default([]),
  }),
});

export const pageSchema = z.object({
  nextCursor: z.string().nullable(),
});

export const languageCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(12)
  .regex(/^[a-z]{2,12}$/, 'language must be a lowercase language code');

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(150)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase letters, numbers, and hyphens');

export const episodeIdSchema = z.string().trim().uuid();

const limitSchema = z.coerce.number().int().min(1).max(50);

export const cursorSchema = z.string().trim().min(1).max(512);

export const universeListQuerySchema = z.object({
  language: languageCodeSchema.optional(),
  limit: limitSchema.default(20),
  cursor: cursorSchema.optional(),
});

export const storyListQuerySchema = z.object({
  universe: slugSchema.optional(),
  language: languageCodeSchema.optional(),
  category: slugSchema.optional(),
  limit: limitSchema.default(20),
  cursor: cursorSchema.optional(),
});

export const episodeListQuerySchema = z.object({
  limit: limitSchema.default(20),
  cursor: cursorSchema.optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(80),
  language: languageCodeSchema.optional(),
  limit: limitSchema.default(20),
  cursor: cursorSchema.optional(),
});

export const slugParamsSchema = z.object({
  slug: slugSchema,
});

export const storySlugParamsSchema = z.object({
  storySlug: slugSchema,
});

export const episodeIdParamsSchema = z.object({
  episodeId: episodeIdSchema,
});

export const publicMediaSchema = z.object({
  id: z.string().uuid(),
  playbackManifestUrl: z.string().nullable(),
  posterUrl: z.string().nullable(),
  captionsUrl: z.string().nullable(),
  durationSeconds: z.number().int().nonnegative().nullable(),
});

export const publicUniverseSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  title: z.string().min(1),
  description: z.string().nullable(),
  primaryLanguage: languageCodeSchema,
  isSampleContent: z.boolean(),
  sampleDisclaimer: z.string().nullable(),
});

export const publicStorySchema = z.object({
  id: z.string().uuid(),
  universeId: z.string().uuid(),
  universeSlug: slugSchema,
  slug: slugSchema,
  title: z.string().min(1),
  synopsis: z.string().nullable(),
  language: languageCodeSchema,
  categorySlugs: z.array(slugSchema),
  tags: z.array(z.string().min(1)),
  durationSeconds: z.number().int().nonnegative().nullable(),
  featured: z.boolean(),
  sortOrder: z.number().int(),
  contentNote: z.string().nullable(),
  isSampleContent: z.boolean(),
  sampleDisclaimer: z.string().nullable(),
  publicEpisodeCount: z.number().int().nonnegative(),
});

export const publicEpisodeSchema = z.object({
  id: z.string().uuid(),
  storyId: z.string().uuid(),
  storySlug: slugSchema,
  universeSlug: slugSchema,
  slug: slugSchema,
  title: z.string().min(1),
  synopsis: z.string().nullable(),
  episodeNumber: z.number().int().positive(),
  language: languageCodeSchema,
  durationSeconds: z.number().int().nonnegative().nullable(),
  captionsAvailable: z.boolean(),
  isSampleContent: z.boolean(),
  sampleDisclaimer: z.string().nullable(),
  media: publicMediaSchema,
});

export const searchHitSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('story'),
    story: publicStorySchema,
  }),
  z.object({
    type: z.literal('episode'),
    episode: publicEpisodeSchema,
  }),
]);

export const publicUniverseListResponseSchema = z.object({
  data: z.array(publicUniverseSchema),
  page: pageSchema,
});

export const publicStoryListResponseSchema = z.object({
  data: z.array(publicStorySchema),
  page: pageSchema,
});

export const publicEpisodeListResponseSchema = z.object({
  data: z.array(publicEpisodeSchema),
  page: pageSchema,
});

export const searchResponseSchema = z.object({
  data: z.array(searchHitSchema),
  page: pageSchema,
});

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type PublicMedia = z.infer<typeof publicMediaSchema>;
export type PublicUniverse = z.infer<typeof publicUniverseSchema>;
export type PublicStory = z.infer<typeof publicStorySchema>;
export type PublicEpisode = z.infer<typeof publicEpisodeSchema>;
export type SearchHit = z.infer<typeof searchHitSchema>;
export type UniverseListQuery = z.infer<typeof universeListQuerySchema>;
export type StoryListQuery = z.infer<typeof storyListQuerySchema>;
export type EpisodeListQuery = z.infer<typeof episodeListQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const cursorTypeSchema = z.enum([
  'universe',
  'story',
  'episode',
  'search',
  'favorite',
  'progress',
  'admin_universe',
  'admin_story',
  'admin_episode',
  'admin_audit',
]);

export const cursorPayloadSchema = z.object({
  t: cursorTypeSchema,
  k: z.string().min(1).max(200),
  i: z.string().min(1).max(80),
});

export type CursorType = z.infer<typeof cursorTypeSchema>;
export type CursorPayload = z.infer<typeof cursorPayloadSchema>;

export class CursorError extends Error {
  constructor(message = 'Invalid cursor') {
    super(message);
    this.name = 'CursorError';
  }
}

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function encodeBase64UrlAscii(value: string): string {
  const bytes = Array.from(value, (char) => {
    const code = char.charCodeAt(0);
    if (code > 127) {
      throw new CursorError();
    }
    return code;
  });

  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const triple = (first << 16) | (second << 8) | third;
    output += BASE64URL[(triple >> 18) & 63] ?? '';
    output += BASE64URL[(triple >> 12) & 63] ?? '';
    if (index + 1 < bytes.length) {
      output += BASE64URL[(triple >> 6) & 63] ?? '';
    }
    if (index + 2 < bytes.length) {
      output += BASE64URL[triple & 63] ?? '';
    }
  }
  return output;
}

function decodeBase64UrlAscii(value: string): string {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length === 0) {
    throw new CursorError();
  }

  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 4) {
    const first = BASE64URL.indexOf(value[index] ?? '');
    const second = BASE64URL.indexOf(value[index + 1] ?? '');
    const third = value[index + 2] ? BASE64URL.indexOf(value[index + 2] ?? '') : 0;
    const fourth = value[index + 3] ? BASE64URL.indexOf(value[index + 3] ?? '') : 0;
    if (first < 0 || second < 0 || third < 0 || fourth < 0) {
      throw new CursorError();
    }
    const triple = (first << 18) | (second << 12) | (third << 6) | fourth;
    bytes.push((triple >> 16) & 255);
    if (value[index + 2]) {
      bytes.push((triple >> 8) & 255);
    }
    if (value[index + 3]) {
      bytes.push(triple & 255);
    }
  }

  return String.fromCharCode(...bytes);
}

export function encodeCursor(payload: CursorPayload): string {
  return encodeBase64UrlAscii(JSON.stringify(cursorPayloadSchema.parse(payload)));
}

export function decodeCursor(value: string, expectedType: CursorType): CursorPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeBase64UrlAscii(value));
  } catch (error) {
    if (error instanceof CursorError) {
      throw error;
    }
    throw new CursorError();
  }

  const payload = cursorPayloadSchema.safeParse(parsed);
  if (!payload.success || payload.data.t !== expectedType) {
    throw new CursorError();
  }

  return payload.data;
}

export function compareCursor(sortKey: string, id: string, cursor: CursorPayload): number {
  if (sortKey > cursor.k) {
    return 1;
  }
  if (sortKey < cursor.k) {
    return -1;
  }
  if (id > cursor.i) {
    return 1;
  }
  if (id < cursor.i) {
    return -1;
  }
  return 0;
}

export function paginateItems<T>(
  items: T[],
  limit: number,
  cursor: string | undefined,
  type: CursorType,
  getCursor: (item: T) => { k: string; i: string },
): { data: T[]; nextCursor: string | null } {
  const decoded = cursor ? decodeCursor(cursor, type) : null;
  const after = decoded
    ? items.filter((item) => {
        const { k, i } = getCursor(item);
        return compareCursor(k, i, decoded) > 0;
      })
    : items;
  const data = after.slice(0, limit);
  const last = data.at(-1);
  const hasMore = after.length > limit && last !== undefined;

  return {
    data,
    nextCursor: hasMore ? encodeCursor({ t: type, ...getCursor(last) }) : null,
  };
}
