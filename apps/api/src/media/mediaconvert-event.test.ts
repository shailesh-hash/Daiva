import { describe, expect, it, vi } from 'vitest';

import { expectedMasterKey, hlsDestination, resolveMasterObjectKey } from './hls.js';
import { handleMediaConvertEvent } from './mediaconvert-event.js';

function prismaStub(media: {
  id: string;
  episodeId: string | null;
  processingStatus: string;
  processingJobId: string | null;
}) {
  return {
    mediaAsset: {
      findUnique: vi.fn().mockResolvedValue(media),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    episode: {
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        mediaAsset: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        episode: {
          update: vi.fn().mockResolvedValue({}),
        },
      }),
    ),
  };
}

describe('resolveMasterObjectKey', () => {
  it('uses MediaConvert playlistFilePaths for the HLS master playlist', () => {
    expect(
      resolveMasterObjectKey(
        {
          outputGroupDetails: [
            {
              type: 'HLS_GROUP',
              playlistFilePaths: ['s3://private-output/episodes/media-1/main.m3u8'],
            },
          ],
        },
        'media-1',
        'private-output',
      ),
    ).toBe('episodes/media-1/main.m3u8');
  });

  it('falls back to the documented main.m3u8 key', () => {
    expect(resolveMasterObjectKey({}, 'media-1', 'private-output')).toBe(
      expectedMasterKey('media-1'),
    );
    expect(hlsDestination('private-output', 'media-1')).toBe(
      's3://private-output/episodes/media-1/main',
    );
  });
});

describe('handleMediaConvertEvent', () => {
  it('ignores duplicate events for a media row already READY', async () => {
    const prisma = prismaStub({
      id: 'media-1',
      episodeId: 'episode-1',
      processingStatus: 'READY',
      processingJobId: 'job-1',
    });
    await handleMediaConvertEvent(
      { detail: { status: 'COMPLETE', jobId: 'job-1', userMetadata: { mediaId: 'media-1' } } },
      { prisma: prisma as never, s3: {} as never, outputBucket: 'private-output' },
    );
    expect(prisma.mediaAsset.updateMany).not.toHaveBeenCalled();
  });

  it('ignores events whose job ID does not match the claimed job', async () => {
    const prisma = prismaStub({
      id: 'media-1',
      episodeId: 'episode-1',
      processingStatus: 'PROCESSING',
      processingJobId: 'job-1',
    });
    await handleMediaConvertEvent(
      { detail: { status: 'COMPLETE', jobId: 'job-other', userMetadata: { mediaId: 'media-1' } } },
      { prisma: prisma as never, s3: {} as never, outputBucket: 'private-output' },
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('marks failed jobs as FAILED once', async () => {
    const prisma = prismaStub({
      id: 'media-1',
      episodeId: 'episode-1',
      processingStatus: 'PROCESSING',
      processingJobId: 'job-1',
    });
    await handleMediaConvertEvent(
      { detail: { status: 'ERROR', jobId: 'job-1', userMetadata: { mediaId: 'media-1' } } },
      { prisma: prisma as never, s3: {} as never, outputBucket: 'private-output' },
    );
    expect(prisma.mediaAsset.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'media-1', processingStatus: 'PROCESSING', processingJobId: 'job-1' },
        data: { processingStatus: 'FAILED' },
      }),
    );
  });

  it('marks READY only after the HLS master playlist exists', async () => {
    const prisma = prismaStub({
      id: 'media-1',
      episodeId: 'episode-1',
      processingStatus: 'PROCESSING',
      processingJobId: 'job-1',
    });
    const s3 = { send: vi.fn().mockResolvedValue({}) };
    await handleMediaConvertEvent(
      {
        detail: {
          status: 'COMPLETE',
          jobId: 'job-1',
          userMetadata: { mediaId: 'media-1' },
          outputGroupDetails: [
            { playlistFilePaths: ['s3://private-output/episodes/media-1/main.m3u8'] },
          ],
        },
      },
      {
        prisma: prisma as never,
        s3: s3 as never,
        outputBucket: 'private-output',
        cdnDomain: 'media.example.test',
      },
    );
    expect(s3.send).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
