import { evaluatePublication, isReviewApproved, isRightsApproved } from '@daiva/domain';

import { createPrismaClient } from '../src/db/prisma.js';

const SAMPLE_DISCLAIMER =
  'Sample dramatization for product preview only. Titles, scripts, and episode metadata are invented placeholders, not verified religious, historical, or canonical Guru Daiva Dutta material.';

const IDS = {
  universe: '11111111-1111-4111-8111-111111111111',
  storyLamp: '22222222-2222-4222-8222-222222222221',
  storyRiver: '22222222-2222-4222-8222-222222222222',
  storyDrum: '22222222-2222-4222-8222-222222222223',
  storyDraft: '22222222-2222-4222-8222-222222222224',
  epLamp1: '33333333-3333-4333-8333-333333333331',
  epLamp2: '33333333-3333-4333-8333-333333333332',
  epLamp3: '33333333-3333-4333-8333-333333333333',
  epRiver1: '33333333-3333-4333-8333-333333333334',
  epRiver2: '33333333-3333-4333-8333-333333333335',
  epDrum1: '33333333-3333-4333-8333-333333333336',
  epDraft1: '33333333-3333-4333-8333-333333333337',
  epStatusOnly: '33333333-3333-4333-8333-333333333338',
  catDevotional: '44444444-4444-4444-8444-444444444441',
  catFolklore: '44444444-4444-4444-8444-444444444442',
  catShort: '44444444-4444-4444-8444-444444444443',
  tagKannada: '55555555-5555-4555-8555-555555555551',
  tagKindness: '55555555-5555-4555-8555-555555555552',
  tagGuru: '55555555-5555-4555-8555-555555555553',
  tagCourage: '55555555-5555-4555-8555-555555555554',
  tagEnglish: '55555555-5555-4555-8555-555555555555',
  tagMusic: '55555555-5555-4555-8555-555555555556',
  tagDraft: '55555555-5555-4555-8555-555555555557',
  userDev: '66666666-6666-4666-8666-666666666661',
  mediaUploaded: '77777777-7777-4777-8777-777777777771',
  mediaReady: '77777777-7777-4777-8777-777777777772',
  mediaLamp2: '77777777-7777-4777-8777-777777777773',
  mediaRiver1: '77777777-7777-4777-8777-777777777774',
  mediaRiver2: '77777777-7777-4777-8777-777777777775',
  mediaDrum1: '77777777-7777-4777-8777-777777777776',
  rightsUploaded: '88888888-8888-4888-8888-888888888881',
  rightsReady: '88888888-8888-4888-8888-888888888882',
  rightsLamp2: '88888888-8888-4888-8888-888888888883',
  rightsRiver1: '88888888-8888-4888-8888-888888888884',
  rightsRiver2: '88888888-8888-4888-8888-888888888885',
  rightsDrum1: '88888888-8888-4888-8888-888888888886',
  reviewLamp1: '99999999-9999-4999-8999-999999999991',
  reviewStatusOnly: '99999999-9999-4999-8999-999999999992',
  reviewLamp2: '99999999-9999-4999-8999-999999999993',
  reviewRiver1: '99999999-9999-4999-8999-999999999994',
  reviewRiver2: '99999999-9999-4999-8999-999999999995',
  reviewDrum1: '99999999-9999-4999-8999-999999999996',
  favoriteRiver: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  progressLamp: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  auditSeed: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
} as const;

const DEVELOPMENT_PUBLISHED_AT = new Date('2026-01-15T00:00:00.000Z');
const DEVELOPMENT_PUBLIC_EPISODE_IDS = [
  IDS.epLamp1,
  IDS.epLamp2,
  IDS.epRiver1,
  IDS.epRiver2,
  IDS.epDrum1,
] as const;

async function upsertReadyMedia(
  prisma: ReturnType<typeof createPrismaClient>,
  id: string,
  episodeId: string,
  objectKey: string,
  durationSeconds: number,
): Promise<void> {
  await prisma.mediaAsset.upsert({
    where: { id },
    update: {
      episodeId,
      provider: 's3',
      sourceObjectKey: objectKey,
      processingStatus: 'READY',
      durationSeconds,
      playbackManifestUrl: null,
      posterUrl: null,
      captionsUrl: null,
    },
    create: {
      id,
      episodeId,
      provider: 's3',
      sourceObjectKey: objectKey,
      processingStatus: 'READY',
      durationSeconds,
    },
  });
}

async function upsertDevelopmentRights(
  prisma: ReturnType<typeof createPrismaClient>,
  id: string,
  mediaAssetId: string,
): Promise<void> {
  await prisma.contentRights.upsert({
    where: { id },
    update: {
      mediaAssetId,
      rightsType: 'ORIGINAL',
      sourceDescription:
        'Development-only grant for local catalogue testing. Not a production rights clearance.',
      approvedBy: 'dev-seed',
      approvedAt: DEVELOPMENT_PUBLISHED_AT,
    },
    create: {
      id,
      mediaAssetId,
      rightsType: 'ORIGINAL',
      sourceDescription:
        'Development-only grant for local catalogue testing. Not a production rights clearance.',
      approvedBy: 'dev-seed',
      approvedAt: DEVELOPMENT_PUBLISHED_AT,
    },
  });
}

async function upsertApprovedReview(
  prisma: ReturnType<typeof createPrismaClient>,
  id: string,
  episodeId: string,
): Promise<void> {
  await prisma.contentReview.upsert({
    where: { id },
    update: {
      episodeId,
      reviewerId: IDS.userDev,
      decision: 'APPROVED',
      notes: 'Development-only editorial grant for local API testing.',
      reviewedAt: DEVELOPMENT_PUBLISHED_AT,
    },
    create: {
      id,
      episodeId,
      reviewerId: IDS.userDev,
      decision: 'APPROVED',
      notes: 'Development-only editorial grant for local API testing.',
      reviewedAt: DEVELOPMENT_PUBLISHED_AT,
    },
  });
}

async function grantDevelopmentPublication(
  prisma: ReturnType<typeof createPrismaClient>,
): Promise<void> {
  await prisma.storyUniverse.update({
    where: { id: IDS.universe },
    data: { status: 'PUBLISHED' },
  });

  for (const storyId of [IDS.storyLamp, IDS.storyRiver, IDS.storyDrum]) {
    await prisma.story.update({
      where: { id: storyId },
      data: { status: 'PUBLISHED' },
    });
  }

  const mediaByEpisode = [
    {
      episodeId: IDS.epLamp1,
      mediaId: IDS.mediaUploaded,
      rightsId: IDS.rightsUploaded,
      reviewId: IDS.reviewLamp1,
      objectKey: 'sample/dev/lamp-01-source.mp4',
      durationSeconds: 95,
    },
    {
      episodeId: IDS.epLamp2,
      mediaId: IDS.mediaLamp2,
      rightsId: IDS.rightsLamp2,
      reviewId: IDS.reviewLamp2,
      objectKey: 'sample/dev/lamp-02-source.mp4',
      durationSeconds: 88,
    },
    {
      episodeId: IDS.epRiver1,
      mediaId: IDS.mediaRiver1,
      rightsId: IDS.rightsRiver1,
      reviewId: IDS.reviewRiver1,
      objectKey: 'sample/dev/river-01-source.mp4',
      durationSeconds: 110,
    },
    {
      episodeId: IDS.epRiver2,
      mediaId: IDS.mediaRiver2,
      rightsId: IDS.rightsRiver2,
      reviewId: IDS.reviewRiver2,
      objectKey: 'sample/dev/river-02-source.mp4',
      durationSeconds: 100,
    },
    {
      episodeId: IDS.epDrum1,
      mediaId: IDS.mediaDrum1,
      rightsId: IDS.rightsDrum1,
      reviewId: IDS.reviewDrum1,
      objectKey: 'sample/dev/drum-01-source.mp4',
      durationSeconds: 180,
    },
  ] as const;

  for (const item of mediaByEpisode) {
    await upsertReadyMedia(
      prisma,
      item.mediaId,
      item.episodeId,
      item.objectKey,
      item.durationSeconds,
    );
    await prisma.episode.update({
      where: { id: item.episodeId },
      data: {
        status: 'PUBLISHED',
        mediaAssetId: item.mediaId,
        publishedAt: DEVELOPMENT_PUBLISHED_AT,
      },
    });
    await upsertDevelopmentRights(prisma, item.rightsId, item.mediaId);
    await upsertApprovedReview(prisma, item.reviewId, item.episodeId);
  }
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed when NODE_ENV=production.');
  }

  const prisma = createPrismaClient();

  try {
    await prisma.appUser.upsert({
      where: { id: IDS.userDev },
      update: { authSubject: 'dev-seed-user', preferredLanguage: 'kn', deletedAt: null },
      create: {
        id: IDS.userDev,
        authSubject: 'dev-seed-user',
        preferredLanguage: 'kn',
      },
    });

    await prisma.userPreference.upsert({
      where: { userId: IDS.userDev },
      update: { preferredLanguage: 'kn', interestSlugs: ['devotional', 'kannada'] },
      create: {
        userId: IDS.userDev,
        preferredLanguage: 'kn',
        interestSlugs: ['devotional', 'kannada'],
      },
    });

    await prisma.storyUniverse.upsert({
      where: { id: IDS.universe },
      update: {
        slug: 'guru-daiva-dutta',
        title: 'Guru Daiva Dutta',
        description:
          'Development seed for the first Daiva Stories universe. Titles are invented placeholders and stay draft until rights, review, and READY media exist.',
        primaryLanguage: 'kn',
        status: 'DRAFT',
        isSampleContent: true,
        sampleDisclaimer: SAMPLE_DISCLAIMER,
      },
      create: {
        id: IDS.universe,
        slug: 'guru-daiva-dutta',
        title: 'Guru Daiva Dutta',
        description:
          'Development seed for the first Daiva Stories universe. Titles are invented placeholders and stay draft until rights, review, and READY media exist.',
        primaryLanguage: 'kn',
        status: 'DRAFT',
        isSampleContent: true,
        sampleDisclaimer: SAMPLE_DISCLAIMER,
      },
    });

    const categories = [
      { id: IDS.catDevotional, slug: 'devotional', title: 'Devotional' },
      { id: IDS.catFolklore, slug: 'folklore', title: 'Folklore' },
      { id: IDS.catShort, slug: 'short-episode', title: 'Short episode' },
    ];
    for (const category of categories) {
      await prisma.category.upsert({
        where: { id: category.id },
        update: { slug: category.slug, title: category.title },
        create: category,
      });
    }

    const tags = [
      { id: IDS.tagKannada, slug: 'kannada', title: 'Kannada' },
      { id: IDS.tagKindness, slug: 'kindness', title: 'Kindness' },
      { id: IDS.tagGuru, slug: 'guru-daiva-dutta', title: 'Guru Daiva Dutta' },
      { id: IDS.tagCourage, slug: 'courage', title: 'Courage' },
      { id: IDS.tagEnglish, slug: 'english', title: 'English' },
      { id: IDS.tagMusic, slug: 'music', title: 'Music' },
      { id: IDS.tagDraft, slug: 'draft', title: 'Draft' },
    ];
    for (const tag of tags) {
      await prisma.tag.upsert({
        where: { id: tag.id },
        update: { slug: tag.slug, title: tag.title },
        create: tag,
      });
    }

    const stories = [
      {
        id: IDS.storyLamp,
        slug: 'the-lamp-at-dusk',
        title: 'The Lamp at Dusk (sample)',
        synopsis:
          'A sample short series about a village lamp lit at dusk. Fictional outline for development only.',
        language: 'kn',
        sortOrder: 1,
        featured: true,
        durationSeconds: 270,
        contentNote: 'General audience sample. Invented script.',
        categoryIds: [IDS.catDevotional, IDS.catShort],
        tagIds: [IDS.tagKannada, IDS.tagKindness, IDS.tagGuru],
      },
      {
        id: IDS.storyRiver,
        slug: 'the-river-crossing',
        title: 'The River Crossing (sample)',
        synopsis: 'Placeholder folklore-inspired fiction for layout and relationship tests.',
        language: 'kn',
        sortOrder: 2,
        featured: true,
        durationSeconds: 210,
        contentNote: 'General audience sample. Invented script.',
        categoryIds: [IDS.catFolklore, IDS.catShort],
        tagIds: [IDS.tagKannada, IDS.tagCourage, IDS.tagGuru],
      },
      {
        id: IDS.storyDrum,
        slug: 'the-drum-of-the-grove',
        title: 'The Drum of the Grove (sample)',
        synopsis: 'Placeholder metadata only; no claim of ritual or historical accuracy.',
        language: 'en',
        sortOrder: 3,
        featured: false,
        durationSeconds: 180,
        contentNote: 'General audience sample. Invented script.',
        categoryIds: [IDS.catFolklore],
        tagIds: [IDS.tagEnglish, IDS.tagMusic, IDS.tagGuru],
      },
      {
        id: IDS.storyDraft,
        slug: 'unpublished-editorial-draft',
        title: 'Unpublished editorial draft (sample)',
        synopsis: 'This draft must never appear in the public catalogue.',
        language: 'kn',
        sortOrder: 99,
        featured: false,
        durationSeconds: 60,
        contentNote: 'Hidden draft',
        categoryIds: [IDS.catDevotional],
        tagIds: [IDS.tagDraft],
      },
    ] as const;

    for (const story of stories) {
      await prisma.story.upsert({
        where: { id: story.id },
        update: {
          universeId: IDS.universe,
          slug: story.slug,
          title: story.title,
          synopsis: story.synopsis,
          language: story.language,
          status: 'DRAFT',
          sortOrder: story.sortOrder,
          featured: story.featured,
          durationSeconds: story.durationSeconds,
          contentNote: story.contentNote,
          isSampleContent: true,
          sampleDisclaimer: SAMPLE_DISCLAIMER,
        },
        create: {
          id: story.id,
          universeId: IDS.universe,
          slug: story.slug,
          title: story.title,
          synopsis: story.synopsis,
          language: story.language,
          status: 'DRAFT',
          sortOrder: story.sortOrder,
          featured: story.featured,
          durationSeconds: story.durationSeconds,
          contentNote: story.contentNote,
          isSampleContent: true,
          sampleDisclaimer: SAMPLE_DISCLAIMER,
        },
      });

      await prisma.storyCategory.deleteMany({ where: { storyId: story.id } });
      await prisma.storyCategory.createMany({
        data: story.categoryIds.map((categoryId) => ({ storyId: story.id, categoryId })),
      });

      await prisma.storyTag.deleteMany({ where: { storyId: story.id } });
      await prisma.storyTag.createMany({
        data: story.tagIds.map((tagId) => ({ storyId: story.id, tagId })),
      });
    }

    const episodes = [
      {
        id: IDS.epLamp1,
        storyId: IDS.storyLamp,
        slug: 'lighting-the-first-lamp',
        title: 'Lighting the First Lamp (sample)',
        synopsis: 'Sample episode 1. Invented scene about preparing oil and wick.',
        episodeNumber: 1,
        language: 'kn',
        durationSeconds: 95,
        status: 'DRAFT' as const,
        mediaAssetId: IDS.mediaUploaded,
        captionsAvailable: true,
        publishedAt: null,
      },
      {
        id: IDS.epLamp2,
        storyId: IDS.storyLamp,
        slug: 'neighbors-at-the-door',
        title: 'Neighbors at the Door (sample)',
        synopsis: 'Sample episode 2. Invented scene about sharing light with a neighbor.',
        episodeNumber: 2,
        language: 'kn',
        durationSeconds: 88,
        status: 'DRAFT' as const,
        mediaAssetId: null,
        captionsAvailable: true,
        publishedAt: null,
      },
      {
        id: IDS.epLamp3,
        storyId: IDS.storyLamp,
        slug: 'the-quiet-courtyard',
        title: 'The Quiet Courtyard (sample)',
        synopsis: 'Sample episode 3. No media is attached yet.',
        episodeNumber: 3,
        language: 'kn',
        durationSeconds: 87,
        status: 'DRAFT' as const,
        mediaAssetId: null,
        captionsAvailable: false,
        publishedAt: null,
      },
      {
        id: IDS.epRiver1,
        storyId: IDS.storyRiver,
        slug: 'waiting-on-the-bank',
        title: 'Waiting on the Bank (sample)',
        synopsis: 'Sample episode 1. Invented scene about reading the river before crossing.',
        episodeNumber: 1,
        language: 'kn',
        durationSeconds: 110,
        status: 'DRAFT' as const,
        mediaAssetId: null,
        captionsAvailable: true,
        publishedAt: null,
      },
      {
        id: IDS.epRiver2,
        storyId: IDS.storyRiver,
        slug: 'the-safer-path',
        title: 'The Safer Path (sample)',
        synopsis: 'Sample episode 2. Invented scene about choosing a longer, safer route.',
        episodeNumber: 2,
        language: 'kn',
        durationSeconds: 100,
        status: 'DRAFT' as const,
        mediaAssetId: null,
        captionsAvailable: false,
        publishedAt: null,
      },
      {
        id: IDS.epDrum1,
        storyId: IDS.storyDrum,
        slug: 'a-sound-from-the-trees',
        title: 'A Sound from the Trees (sample)',
        synopsis: 'Sample English-language placeholder for search tests.',
        episodeNumber: 1,
        language: 'en',
        durationSeconds: 180,
        status: 'DRAFT' as const,
        mediaAssetId: null,
        captionsAvailable: true,
        publishedAt: null,
      },
      {
        id: IDS.epDraft1,
        storyId: IDS.storyDraft,
        slug: 'hidden-draft-episode',
        title: 'Hidden draft episode (sample)',
        synopsis: 'Must stay out of public browse results.',
        episodeNumber: 1,
        language: 'kn',
        durationSeconds: 60,
        status: 'DRAFT' as const,
        mediaAssetId: null,
        captionsAvailable: false,
        publishedAt: null,
      },
      {
        id: IDS.epStatusOnly,
        storyId: IDS.storyDraft,
        slug: 'status-only-published',
        title: 'Status-only published row (sample)',
        synopsis:
          'Intentionally marked PUBLISHED without approved rights, editorial approval, or a public catalogue claim.',
        episodeNumber: 2,
        language: 'kn',
        durationSeconds: 60,
        status: 'PUBLISHED' as const,
        mediaAssetId: IDS.mediaReady,
        captionsAvailable: false,
        publishedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];

    for (const episode of episodes) {
      await prisma.episode.upsert({
        where: { id: episode.id },
        update: {
          storyId: episode.storyId,
          slug: episode.slug,
          title: episode.title,
          synopsis: episode.synopsis,
          episodeNumber: episode.episodeNumber,
          language: episode.language,
          durationSeconds: episode.durationSeconds,
          mediaAssetId: null,
          status: episode.status,
          publishedAt: episode.publishedAt,
          captionsAvailable: episode.captionsAvailable,
          isSampleContent: true,
          sampleDisclaimer: SAMPLE_DISCLAIMER,
        },
        create: {
          id: episode.id,
          storyId: episode.storyId,
          slug: episode.slug,
          title: episode.title,
          synopsis: episode.synopsis,
          episodeNumber: episode.episodeNumber,
          language: episode.language,
          durationSeconds: episode.durationSeconds,
          mediaAssetId: null,
          status: episode.status,
          publishedAt: episode.publishedAt,
          captionsAvailable: episode.captionsAvailable,
          isSampleContent: true,
          sampleDisclaimer: SAMPLE_DISCLAIMER,
        },
      });
    }

    await prisma.mediaAsset.upsert({
      where: { id: IDS.mediaUploaded },
      update: {
        episodeId: IDS.epLamp1,
        provider: 's3',
        sourceObjectKey: 'sample/draft/lamp-01-source.mp4',
        processingStatus: 'UPLOADED',
        durationSeconds: 95,
        playbackManifestUrl: null,
        posterUrl: null,
        captionsUrl: null,
      },
      create: {
        id: IDS.mediaUploaded,
        episodeId: IDS.epLamp1,
        provider: 's3',
        sourceObjectKey: 'sample/draft/lamp-01-source.mp4',
        processingStatus: 'UPLOADED',
        durationSeconds: 95,
      },
    });

    await prisma.mediaAsset.upsert({
      where: { id: IDS.mediaReady },
      update: {
        episodeId: IDS.epStatusOnly,
        provider: 's3',
        sourceObjectKey: 'sample/draft/status-only-source.mp4',
        processingStatus: 'READY',
        durationSeconds: 60,
        playbackManifestUrl: null,
        posterUrl: null,
        captionsUrl: null,
      },
      create: {
        id: IDS.mediaReady,
        episodeId: IDS.epStatusOnly,
        provider: 's3',
        sourceObjectKey: 'sample/draft/status-only-source.mp4',
        processingStatus: 'READY',
        durationSeconds: 60,
      },
    });

    await prisma.episode.update({
      where: { id: IDS.epLamp1 },
      data: { mediaAssetId: IDS.mediaUploaded },
    });
    await prisma.episode.update({
      where: { id: IDS.epStatusOnly },
      data: { mediaAssetId: IDS.mediaReady },
    });

    await prisma.contentRights.upsert({
      where: { id: IDS.rightsUploaded },
      update: {
        mediaAssetId: IDS.mediaUploaded,
        rightsType: 'ORIGINAL',
        sourceDescription:
          'Development placeholder. No license evidence and no rights approval have been recorded.',
        evidenceUrl: null,
        approvedBy: null,
        approvedAt: null,
      },
      create: {
        id: IDS.rightsUploaded,
        mediaAssetId: IDS.mediaUploaded,
        rightsType: 'ORIGINAL',
        sourceDescription:
          'Development placeholder. No license evidence and no rights approval have been recorded.',
      },
    });

    await prisma.contentRights.upsert({
      where: { id: IDS.rightsReady },
      update: {
        mediaAssetId: IDS.mediaReady,
        rightsType: 'ORIGINAL',
        sourceDescription:
          'Development placeholder attached to a READY asset. approved_at stays null on purpose.',
        evidenceUrl: null,
        approvedBy: null,
        approvedAt: null,
      },
      create: {
        id: IDS.rightsReady,
        mediaAssetId: IDS.mediaReady,
        rightsType: 'ORIGINAL',
        sourceDescription:
          'Development placeholder attached to a READY asset. approved_at stays null on purpose.',
      },
    });

    await prisma.contentReview.upsert({
      where: { id: IDS.reviewLamp1 },
      update: {
        episodeId: IDS.epLamp1,
        decision: 'PENDING',
        reviewerId: null,
        notes: 'Awaiting human editorial review. Seed must not invent an approval.',
        reviewedAt: null,
      },
      create: {
        id: IDS.reviewLamp1,
        episodeId: IDS.epLamp1,
        decision: 'PENDING',
        notes: 'Awaiting human editorial review. Seed must not invent an approval.',
      },
    });

    await prisma.contentReview.upsert({
      where: { id: IDS.reviewStatusOnly },
      update: {
        episodeId: IDS.epStatusOnly,
        decision: 'PENDING',
        reviewerId: null,
        notes: 'PUBLISHED status without an approved review is still not public.',
        reviewedAt: null,
      },
      create: {
        id: IDS.reviewStatusOnly,
        episodeId: IDS.epStatusOnly,
        decision: 'PENDING',
        notes: 'PUBLISHED status without an approved review is still not public.',
      },
    });

    await prisma.favorite.upsert({
      where: { userId_storyId: { userId: IDS.userDev, storyId: IDS.storyRiver } },
      update: {},
      create: {
        id: IDS.favoriteRiver,
        userId: IDS.userDev,
        storyId: IDS.storyRiver,
      },
    });

    await prisma.playbackProgress.upsert({
      where: { userId_episodeId: { userId: IDS.userDev, episodeId: IDS.epLamp1 } },
      update: { positionSeconds: 42, completed: false, lastPlayedAt: new Date() },
      create: {
        id: IDS.progressLamp,
        userId: IDS.userDev,
        episodeId: IDS.epLamp1,
        positionSeconds: 42,
        completed: false,
      },
    });

    await prisma.adminAuditLog.upsert({
      where: { id: IDS.auditSeed },
      update: {
        actorSubject: 'dev-seed',
        action: 'seed.development',
        entityType: 'story_universe',
        entityId: IDS.universe,
        details: {
          note: 'Repeatable development seed. Development-only publication grants exist for local API testing and are not production rights clearance.',
        },
      },
      create: {
        id: IDS.auditSeed,
        actorSubject: 'dev-seed',
        action: 'seed.development',
        entityType: 'story_universe',
        entityId: IDS.universe,
        details: {
          note: 'Repeatable development seed. Development-only publication grants exist for local API testing and are not production rights clearance.',
        },
      },
    });

    await grantDevelopmentPublication(prisma);

    const seededEpisodes = await prisma.episode.findMany({
      include: {
        story: { include: { universe: true } },
        currentMedia: { include: { rights: true } },
        reviews: true,
      },
    });

    const publicIds = seededEpisodes
      .filter((episode) => {
        const latestReview =
          [...episode.reviews]
            .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
            .at(-1)?.decision ?? null;
        const rights = episode.currentMedia?.rights.find((record) => isRightsApproved(record));
        return evaluatePublication({
          universeStatus: episode.story.universe.status,
          storyStatus: episode.story.status,
          episodeStatus: episode.status,
          hasMediaAsset: Boolean(episode.mediaAssetId),
          mediaProcessingStatus: episode.currentMedia?.processingStatus ?? null,
          rightsApproved: rights ? isRightsApproved(rights) : false,
          reviewApproved: isReviewApproved(latestReview),
        }).isPublicCatalogue;
      })
      .map((episode) => episode.id);

    const unexpected = publicIds.filter(
      (id) =>
        !DEVELOPMENT_PUBLIC_EPISODE_IDS.includes(
          id as (typeof DEVELOPMENT_PUBLIC_EPISODE_IDS)[number],
        ),
    );
    const missing = DEVELOPMENT_PUBLIC_EPISODE_IDS.filter((id) => !publicIds.includes(id));
    if (unexpected.length > 0 || missing.length > 0) {
      throw new Error(
        `Seed public catalogue mismatch. missing=${missing.join(',')} unexpected=${unexpected.join(',')}`,
      );
    }
    if (
      publicIds.includes(IDS.epDraft1) ||
      publicIds.includes(IDS.epStatusOnly) ||
      publicIds.includes(IDS.epLamp3)
    ) {
      throw new Error('Seed leaked unpublished or incomplete episodes into the public catalogue.');
    }

    console.log(
      `Seed complete: ${seededEpisodes.length} sample episodes, ${publicIds.length} development-public catalogue items.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
