import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { PrismaClient } from '../generated/prisma/client.js';

type MediaConvertEvent = {
  detail?: {
    status?: string;
    jobId?: string;
    userMetadata?: { mediaId?: string; episodeId?: string };
    outputGroupDetails?: Array<{ outputDetails?: Array<{ outputFilePaths?: string[] }> }>;
    errorMessage?: string;
  };
};

export async function handleMediaConvertEvent(
  event: MediaConvertEvent,
  deps: { prisma: PrismaClient; s3: S3Client; outputBucket: string; cdnDomain?: string },
): Promise<void> {
  const detail = event.detail;
  const mediaId = detail?.userMetadata?.mediaId;
  if (!mediaId || !detail?.status) throw new Error('Event is missing MediaConvert status or mediaId metadata');

  // EventBridge delivery is at-least-once. Terminal transitions are guarded by current state.
  const media = await deps.prisma.mediaAsset.findUnique({
    where: { id: mediaId },
    select: { id: true, episodeId: true, processingStatus: true, processingJobId: true },
  });
  if (!media || media.processingJobId !== detail.jobId) return;
  if (media.processingStatus === 'READY' || media.processingStatus === 'FAILED') return;

  if (detail.status === 'ERROR' || detail.status === 'CANCELED') {
    await deps.prisma.mediaAsset.updateMany({
      where: { id: mediaId, processingStatus: 'PROCESSING', processingJobId: detail.jobId },
      data: { processingStatus: 'FAILED' },
    });
    return;
  }
  if (detail.status !== 'COMPLETE') return;

  const paths = detail.outputGroupDetails?.flatMap((group) =>
    group.outputDetails?.flatMap((output) => output.outputFilePaths ?? []) ?? [],
  ) ?? [];
  // Require an actual master manifest in the configured output prefix before marking READY.
  const expectedKey = `episodes/${mediaId}/index.m3u8`;
  const masterExists = await deps.s3.send(new HeadObjectCommand({
    Bucket: deps.outputBucket,
    Key: expectedKey,
  })).then(() => true, () => false);
  if (!masterExists) {
    throw new Error(`MediaConvert completed but expected HLS master manifest is missing for media ${mediaId}; outputs: ${paths.join(', ')}`);
  }
  const manifestUrl = deps.cdnDomain
    ? `https://${deps.cdnDomain}/${expectedKey}`
    : `s3://${deps.outputBucket}/${expectedKey}`;
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
