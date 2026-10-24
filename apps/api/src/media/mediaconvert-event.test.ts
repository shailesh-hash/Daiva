import { describe, expect, it, vi } from 'vitest';
import { handleMediaConvertEvent } from './mediaconvert-event.js';

describe('handleMediaConvertEvent', () => {
  it('ignores duplicate events for a media row already READY', async () => {
    const prisma = {
      mediaAsset: { findUnique: vi.fn().mockResolvedValue({
        id: 'media-1', episodeId: 'episode-1', processingStatus: 'READY', processingJobId: 'job-1',
      }), updateMany: vi.fn() },
      $transaction: vi.fn(),
    } as never;
    await handleMediaConvertEvent({ detail: { status: 'COMPLETE', jobId: 'job-1', userMetadata: { mediaId: 'media-1' } } }, {
      prisma, s3: {} as never, outputBucket: 'private-output',
    });
    expect((prisma as any).mediaAsset.updateMany).not.toHaveBeenCalled();
  });

  it('marks failed jobs as FAILED once', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      mediaAsset: { findUnique: vi.fn().mockResolvedValue({
        id: 'media-1', episodeId: 'episode-1', processingStatus: 'PROCESSING', processingJobId: 'job-1',
      }), updateMany },
    } as never;
    await handleMediaConvertEvent({ detail: { status: 'ERROR', jobId: 'job-1', userMetadata: { mediaId: 'media-1' } } }, {
      prisma, s3: {} as never, outputBucket: 'private-output',
    });
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'media-1', processingStatus: 'PROCESSING', processingJobId: 'job-1' },
      data: { processingStatus: 'FAILED' },
    }));
  });
});
