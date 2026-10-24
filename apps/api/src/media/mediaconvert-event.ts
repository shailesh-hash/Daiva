import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { PrismaClient } from '../generated/prisma/client.js';

import { playbackUrlForKey, resolveMasterObjectKey, type MediaConvertDetail } from './hls.js';

export type MediaConvertEvent = {
  detail?: MediaConvertDetail;
};

export async function handleMediaConvertEvent(
  event: MediaConvertEvent,
  deps: { prisma: PrismaClient; s3: S3Client; outputBucket: string; cdnDomain?: string },
): Promise<void> {
  const detail = event.detail;
  const mediaId = detail?.userMetadata?.mediaId;
  if (!mediaId || !detail?.status) {
    throw new Error('Event is missing MediaConvert status or mediaId metadata');
  }

  const media = await deps.prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    select: { id: true, episodeId: true, processingStatus: true, processingJobId: true },
  });
  if (!media || media.processingJobId !== detail.jobId) {
    return;
  }
  if (media.processingStatus === 'READY' || media.processingStatus === 'FAILED') {
    return;
  }

  if (detail.status === 'ERROR' || detail.status === 'CANCELED') {
    await deps.prisma.mediaAsset.updateMany({
      where: { id: mediaId, processingStatus: 'PROCESSING', processingJobId: detail.jobId },
      data: { processingStatus: 'FAILED' },
    });
    return;
  }
  if (detail.status !== 'COMPLETE') {
    return;
  }

  const masterKey = resolveMasterObjectKey(detail, mediaId, deps.outputBucket);
  const masterExists = await deps.s3
    .send(new HeadObjectCommand({ Bucket: deps.outputBucket, Key: masterKey }))
    .then(
      () => true,
      () => false,
    );
  if (!masterExists) {
    throw new Error(
      `MediaConvert completed but HLS master playlist is missing for media ${mediaId} at ${masterKey}`,
    );
  }

  const manifestUrl = playbackUrlForKey(masterKey, deps.cdnDomain, deps.outputBucket);
  await deps.prisma.$transaction(async (tx) => {
    const updated = await tx.mediaAsset.updateMany({
      where: { id: mediaId, processingStatus: 'PROCESSING', processingJobId: detail.jobId },
      data: { processingStatus: 'READY', playbackManifestUrl: manifestUrl },
    });
    if (updated.count === 1 && media.episodeId) {
      await tx.episode.update({
        where: { id: media.episodeId },
        data: { mediaAssetId: mediaId },
      });
    }
  });
}
