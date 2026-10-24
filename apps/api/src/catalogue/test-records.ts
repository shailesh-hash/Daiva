import type { CatalogueEpisodeRecord, CatalogueUniverseRecord } from './types.js';

const SAMPLE = 'Sample dramatization for product preview only.';

const publicUniverse: CatalogueUniverseRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'guru-daiva-dutta',
  title: 'Guru Daiva Dutta',
  description: 'Public test universe',
  primaryLanguage: 'kn',
  status: 'PUBLISHED',
  isSampleContent: true,
  sampleDisclaimer: SAMPLE,
};

function readyMedia(id: string) {
  return {
    id,
    processingStatus: 'READY' as const,
    playbackManifestUrl: `https://cdn.example.test/${id}/master.m3u8`,
    posterUrl: `https://cdn.example.test/${id}/poster.jpg`,
    captionsUrl: `https://cdn.example.test/${id}/captions.vtt`,
    durationSeconds: 90,
    rights: [
      {
        approvedAt: '2026-01-01T00:00:00.000Z',
        approvedBy: 'editor-1',
        expiresAt: null,
      },
    ],
  };
}

function approvedReviews() {
  return [{ decision: 'APPROVED' as const, createdAt: '2026-01-02T00:00:00.000Z' }];
}

function story(
  id: string,
  slug: string,
  title: string,
  sortOrder: number,
  extras: Partial<CatalogueEpisodeRecord['story']> = {},
): CatalogueEpisodeRecord['story'] {
  return {
    id,
    universeId: publicUniverse.id,
    slug,
    title,
    synopsis: `${title} synopsis`,
    language: 'kn',
    status: 'PUBLISHED',
    sortOrder,
    featured: true,
    durationSeconds: 180,
    contentNote: 'General audience sample',
    isSampleContent: true,
    sampleDisclaimer: SAMPLE,
    categorySlugs: ['devotional'],
    tags: ['kannada'],
    universe: publicUniverse,
    ...extras,
  };
}

function episode(
  partial: Omit<
    CatalogueEpisodeRecord,
    'story' | 'reviews' | 'media' | 'captionsAvailable' | 'isSampleContent' | 'sampleDisclaimer'
  > &
    Partial<
      Pick<
        CatalogueEpisodeRecord,
        'reviews' | 'media' | 'captionsAvailable' | 'isSampleContent' | 'sampleDisclaimer'
      >
    > & {
      story: CatalogueEpisodeRecord['story'];
    },
): CatalogueEpisodeRecord {
  return {
    captionsAvailable: true,
    isSampleContent: true,
    sampleDisclaimer: SAMPLE,
    reviews: approvedReviews(),
    media: readyMedia(partial.mediaAssetId ?? '77777777-7777-4777-8777-777777777770'),
    ...partial,
  };
}

const lampStory = story(
  '22222222-2222-4222-8222-222222222221',
  'the-lamp-at-dusk',
  'The Lamp at Dusk',
  1,
);
const riverStory = story(
  '22222222-2222-4222-8222-222222222222',
  'the-river-crossing',
  'The River Crossing',
  2,
);
const drumStory = story(
  '22222222-2222-4222-8222-222222222223',
  'the-drum-of-the-grove',
  'The Drum of the Grove',
  3,
  { language: 'en', categorySlugs: ['folklore'], tags: ['english'] },
);
const hiddenStory = story(
  '22222222-2222-4222-8222-222222222224',
  'unpublished-editorial-draft',
  'Hidden draft story',
  99,
  { status: 'DRAFT' },
);

export const catalogueTestRecords: CatalogueEpisodeRecord[] = [
  episode({
    id: '33333333-3333-4333-8333-333333333331',
    storyId: lampStory.id,
    slug: 'lighting-the-first-lamp',
    title: 'Lighting the First Lamp',
    synopsis: 'Public lamp episode 1',
    episodeNumber: 1,
    language: 'kn',
    durationSeconds: 95,
    status: 'PUBLISHED',
    mediaAssetId: '77777777-7777-4777-8777-777777777771',
    story: lampStory,
    media: readyMedia('77777777-7777-4777-8777-777777777771'),
  }),
  episode({
    id: '33333333-3333-4333-8333-333333333332',
    storyId: lampStory.id,
    slug: 'neighbors-at-the-door',
    title: 'Neighbors at the Door',
    synopsis: 'Public lamp episode 2',
    episodeNumber: 2,
    language: 'kn',
    durationSeconds: 88,
    status: 'PUBLISHED',
    mediaAssetId: '77777777-7777-4777-8777-777777777772',
    story: lampStory,
    media: readyMedia('77777777-7777-4777-8777-777777777772'),
  }),
  episode({
    id: '33333333-3333-4333-8333-333333333334',
    storyId: riverStory.id,
    slug: 'waiting-on-the-bank',
    title: 'Waiting on the Bank',
    synopsis: 'Public river episode',
    episodeNumber: 1,
    language: 'kn',
    durationSeconds: 110,
    status: 'PUBLISHED',
    mediaAssetId: '77777777-7777-4777-8777-777777777774',
    story: riverStory,
    media: readyMedia('77777777-7777-4777-8777-777777777774'),
  }),
  episode({
    id: '33333333-3333-4333-8333-333333333336',
    storyId: drumStory.id,
    slug: 'a-sound-from-the-trees',
    title: 'A Sound from the Trees',
    synopsis: 'Public English episode',
    episodeNumber: 1,
    language: 'en',
    durationSeconds: 180,
    status: 'PUBLISHED',
    mediaAssetId: '77777777-7777-4777-8777-777777777776',
    story: drumStory,
    media: readyMedia('77777777-7777-4777-8777-777777777776'),
  }),
  episode({
    id: '33333333-3333-4333-8333-333333333337',
    storyId: hiddenStory.id,
    slug: 'hidden-draft-episode',
    title: 'Hidden draft episode',
    synopsis: 'Must stay out of public browse results',
    episodeNumber: 1,
    language: 'kn',
    durationSeconds: 60,
    status: 'DRAFT',
    mediaAssetId: '77777777-7777-4777-8777-777777777777',
    story: hiddenStory,
  }),
  episode({
    id: '33333333-3333-4333-8333-333333333338',
    storyId: lampStory.id,
    slug: 'processing-media',
    title: 'Processing media episode',
    synopsis: 'Published status with media that is not READY',
    episodeNumber: 8,
    language: 'kn',
    durationSeconds: 60,
    status: 'PUBLISHED',
    mediaAssetId: '77777777-7777-4777-8777-777777777778',
    story: lampStory,
    media: {
      id: '77777777-7777-4777-8777-777777777778',
      processingStatus: 'PROCESSING',
      playbackManifestUrl: null,
      posterUrl: null,
      captionsUrl: null,
      durationSeconds: 60,
      rights: [
        {
          approvedAt: '2026-01-01T00:00:00.000Z',
          approvedBy: 'editor-1',
          expiresAt: null,
        },
      ],
    },
  }),
  episode({
    id: '33333333-3333-4333-8333-333333333339',
    storyId: lampStory.id,
    slug: 'unapproved-rights',
    title: 'Unapproved rights episode',
    synopsis: 'READY media without approved rights',
    episodeNumber: 9,
    language: 'kn',
    durationSeconds: 60,
    status: 'PUBLISHED',
    mediaAssetId: '77777777-7777-4777-8777-777777777779',
    story: lampStory,
    media: {
      id: '77777777-7777-4777-8777-777777777779',
      processingStatus: 'READY',
      playbackManifestUrl: 'https://cdn.example.test/secret/master.m3u8',
      posterUrl: null,
      captionsUrl: null,
      durationSeconds: 60,
      rights: [{ approvedAt: null, approvedBy: null, expiresAt: null }],
    },
    reviews: approvedReviews(),
  }),
  episode({
    id: '33333333-3333-4333-8333-333333333330',
    storyId: lampStory.id,
    slug: 'pending-review',
    title: 'Pending review episode',
    synopsis: 'READY media and approved rights, but review is pending',
    episodeNumber: 10,
    language: 'kn',
    durationSeconds: 60,
    status: 'PUBLISHED',
    mediaAssetId: '77777777-7777-4777-8777-777777777780',
    story: lampStory,
    media: readyMedia('77777777-7777-4777-8777-777777777780'),
    reviews: [{ decision: 'PENDING', createdAt: '2026-01-02T00:00:00.000Z' }],
  }),
];

export const PUBLIC_UNIVERSE_SLUG = publicUniverse.slug;
export const PUBLIC_STORY_ID = lampStory.id;
export const PUBLIC_STORY_SLUG = lampStory.slug;
export const PUBLIC_EPISODE_ID = '33333333-3333-4333-8333-333333333331';
export const HIDDEN_STORY_ID = hiddenStory.id;
export const DRAFT_STORY_SLUG = hiddenStory.slug;
export const DRAFT_EPISODE_ID = '33333333-3333-4333-8333-333333333337';
export const NOT_READY_EPISODE_ID = '33333333-3333-4333-8333-333333333338';
export const UNAPPROVED_RIGHTS_EPISODE_ID = '33333333-3333-4333-8333-333333333339';
