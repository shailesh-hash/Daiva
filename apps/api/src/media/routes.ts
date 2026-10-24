import {
  CreateJobCommand,
  GetJobCommand,
} from '@aws-sdk/client-mediaconvert';
import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '../generated/prisma/client.js';
import { ApiHttpError } from '../http/errors.js';
import { createMediaClients } from './aws.js';

const ALLOWED_TYPES = new Set(['video/mp4', 'video/quicktime']);
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

function requireAdmin(request: { authUser?: { isAdmin?: boolean } }): void {
  if (!request.authUser?.isAdmin) throw new ApiHttpError(403, 'FORBIDDEN', 'Admin access required');
}

function sourceKey(mediaId: string): string {
  return `uploads/${mediaId}/source`;
}

export async function registerMediaRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const clients = createMediaClients(env);
  const sourceBucket = clients.sourceBucket;
  const outputBucket = clients.outputBucket;

  app.post<{ Params: { id: string; mediaId: string }; Body: { contentType: string; fileName: string } }>(
    '/v1/admin/episodes/:id/media/:mediaId/upload-url',
    async (request, reply) => {
      requireAdmin(request);
      const { id: episodeId, mediaId } = request.params;
      const contentType = request.body?.contentType;
      const fileName = request.body?.fileName;
      if (!ALLOWED_TYPES.has(contentType) || typeof fileName !== 'string' || !fileName.trim()) {
        throw new ApiHttpError(400, 'VALIDATION_ERROR', 'Upload must be MP4 or QuickTime video');
      }
      const media = await prisma.mediaAsset.findFirst({
        where: { id: mediaId, episodeId },
        select: { id: true, processingStatus: true, sourceObjectKey: true },
      });
      if (!media) throw new ApiHttpError(404, 'NOT_FOUND', 'Media asset not found for episode');
      if (media.processingStatus !== 'UPLOADED' && media.processingStatus !== 'FAILED') {
        throw new ApiHttpError(409, 'CONFLICT', 'A new upload URL is only available before processing or after a failed job');
      }
      const key = sourceKey(mediaId);
      await prisma.mediaAsset.update({ where: { id: mediaId }, data: { sourceObjectKey: key } });
      const url = await getSignedUrl(
        clients.s3,
        new PutObjectCommand({
          Bucket: sourceBucket,
          Key: key,
          ContentType: contentType,
          Metadata: { 'media-id': mediaId, 'original-name': fileName.trim().slice(0, 180) },
        }),
        { expiresIn: 600 },
      );
      return reply.code(200).send({ data: { uploadUrl: url, method: 'PUT', objectKey: key, expiresInSeconds: 600, requiredHeaders: { 'content-type': contentType } } });
    },
  );

  app.post<{ Params: { id: string; mediaId: string } }>(
    '/v1/admin/episodes/:id/media/:mediaId/complete-upload',
    async (request, reply) => {
      requireAdmin(request);
      const { id: episodeId, mediaId } = request.params;
      const media = await prisma.mediaAsset.findFirst({
        where: { id: mediaId, episodeId },
        select: { id: true, sourceObjectKey: true, processingStatus: true },
      });
      if (!media) throw new ApiHttpError(404, 'NOT_FOUND', 'Media asset not found for episode');
      if (!media.sourceObjectKey) throw new ApiHttpError(409, 'CONFLICT', 'Request an upload URL before completing upload');
      if (media.processingStatus !== 'UPLOADED' && media.processingStatus !== 'FAILED') {
        throw new ApiHttpError(409, 'CONFLICT', 'Media upload has already been submitted for processing');
      }
      const head = await clients.s3.send(new HeadObjectCommand({ Bucket: sourceBucket, Key: media.sourceObjectKey }));
      if (!head.ContentLength || head.ContentLength > MAX_UPLOAD_BYTES) {
        throw new ApiHttpError(400, 'VALIDATION_ERROR', 'Uploaded video is empty or exceeds the 2 GB limit');
      }
      if (!ALLOWED_TYPES.has(head.ContentType ?? '')) {
        throw new ApiHttpError(400, 'VALIDATION_ERROR', 'Uploaded object has an unsupported content type');
      }

      // Claim the media row before creating a job so concurrent completion requests cannot
      // launch duplicate transcodes. If CreateJob fails, release the claim as FAILED for admin retry.
      const claim = await prisma.mediaAsset.updateMany({
        where: { id: mediaId, processingStatus: { in: ['UPLOADED', 'FAILED'] } },
        data: { processingStatus: 'QUEUED' },
      });
      if (claim.count !== 1) throw new ApiHttpError(409, 'CONFLICT', 'Media is already queued for processing');

      const destination = `s3://${outputBucket}/episodes/${mediaId}/`;
      try {
        const job = await clients.mediaConvert.send(new CreateJobCommand({
          Role: clients.mediaConvertRoleArn,
          UserMetadata: { mediaId, episodeId },
          Settings: {
            Inputs: [{ FileInput: `s3://${sourceBucket}/${media.sourceObjectKey}` }],
            OutputGroups: [{
              Name: 'HLS',
              OutputGroupSettings: {
                Type: 'HLS_GROUP_SETTINGS',
                HlsGroupSettings: { Destination: destination, SegmentLength: 6, MinSegmentLength: 0 },
              },
              Outputs: [
                { NameModifier: '_720p', ContainerSettings: { Container: 'M3U8' }, VideoDescription: { Width: 1280, Height: 720, CodecSettings: { Codec: 'H_264', H264Settings: { RateControlMode: 'QVBR', QvbrSettings: { QvbrQualityLevel: 7 }, MaxBitrate: 5000000 } } }, AudioDescriptions: [{ CodecSettings: { Codec: 'AAC', AacSettings: { Bitrate: 96000, CodingMode: 'CODING_MODE_2_0', SampleRate: 48000 } } }] },
                { NameModifier: '_360p', ContainerSettings: { Container: 'M3U8' }, VideoDescription: { Width: 640, Height: 360, CodecSettings: { Codec: 'H_264', H264Settings: { RateControlMode: 'QVBR', QvbrSettings: { QvbrQualityLevel: 7 }, MaxBitrate: 1200000 } } }, AudioDescriptions: [{ CodecSettings: { Codec: 'AAC', AacSettings: { Bitrate: 64000, CodingMode: 'CODING_MODE_2_0', SampleRate: 48000 } } }] },
              ],
            }],
          },
        }));
        if (!job.Job?.Id) throw new Error('MediaConvert did not return a job ID');
        await prisma.mediaAsset.update({
          where: { id: mediaId },
          data: { processingStatus: 'PROCESSING', processingJobId: job.Job.Id },
        });
        return reply.code(202).send({ data: { mediaId, jobId: job.Job.Id, status: 'PROCESSING' } });
      } catch (error) {
        await prisma.mediaAsset.update({ where: { id: mediaId }, data: { processingStatus: 'FAILED' } });
        throw error;
      }
    },
  );

  app.get<{ Params: { id: string; mediaId: string } }>(
    '/v1/admin/episodes/:id/media/:mediaId/processing-status',
    async (request, reply) => {
      requireAdmin(request);
      const media = await prisma.mediaAsset.findFirst({
        where: { id: request.params.mediaId, episodeId: request.params.id },
        select: { id: true, processingStatus: true, processingJobId: true, playbackManifestUrl: true },
      });
      if (!media) throw new ApiHttpError(404, 'NOT_FOUND', 'Media asset not found for episode');
      let jobStatus: string | null = null;
      if (media.processingJobId) {
        const result = await clients.mediaConvert.send(new GetJobCommand({ Id: media.processingJobId }));
        jobStatus = result.Job?.Status ?? null;
      }
      return reply.code(200).send({ data: { mediaId: media.id, status: media.processingStatus, jobStatus, playbackManifestUrl: media.playbackManifestUrl } });
    },
  );
}
