import { CreateJobCommand, GetJobCommand } from '@aws-sdk/client-mediaconvert';
import { HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  apiErrorSchema,
  mediaAssetParamsSchema,
  mediaProcessingStatusResponseSchema,
  mediaUploadSessionResponseSchema,
  mediaUploadUrlBodySchema,
} from '@daiva/domain';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';

import type { AuthUser } from '../auth/types.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { ApiHttpError } from '../http/errors.js';
import { createMediaClients } from './aws.js';
import { hlsDestination, sourceObjectKey } from './hls.js';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

function requireAdmin(request: { authUser?: AuthUser }): AuthUser {
  if (!request.authUser?.isAdmin) {
    throw new ApiHttpError(403, 'FORBIDDEN', 'Admin access required');
  }
  return request.authUser;
}

export async function registerMediaRoutes(
  app: FastifyInstance,
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const clients = createMediaClients(env);
  const sourceBucket = clients.sourceBucket;
  const outputBucket = clients.outputBucket;
  const typed = app.withTypeProvider<ZodTypeProvider>();
  const errorResponses = {
    400: apiErrorSchema,
    401: apiErrorSchema,
    403: apiErrorSchema,
    404: apiErrorSchema,
    409: apiErrorSchema,
  };

  typed.post(
    '/v1/admin/episodes/:id/media/:mediaId/upload-url',
    {
      schema: {
        tags: ['Admin'],
        params: mediaAssetParamsSchema,
        body: mediaUploadUrlBodySchema,
        response: { 200: mediaUploadSessionResponseSchema, ...errorResponses },
      },
    },
    async (request, reply) => {
      requireAdmin(request);
      const { id: episodeId, mediaId } = request.params;
      const media = await prisma.mediaAsset.findFirst({
        where: { id: mediaId, episodeId },
        select: { id: true, processingStatus: true },
      });
      if (!media) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Media asset not found for episode');
      }
      if (media.processingStatus !== 'UPLOADED' && media.processingStatus !== 'FAILED') {
        throw new ApiHttpError(
          409,
          'CONFLICT',
          'A new upload URL is only available before processing or after a failed job',
        );
      }
      const key = sourceObjectKey(mediaId);
      await prisma.mediaAsset.update({ where: { id: mediaId }, data: { sourceObjectKey: key } });
      const url = await getSignedUrl(
        clients.s3,
        new PutObjectCommand({
          Bucket: sourceBucket,
          Key: key,
          ContentType: request.body.contentType,
          Metadata: { 'media-id': mediaId },
        }),
        { expiresIn: 600 },
      );
      return reply.code(200).send({
        data: {
          uploadUrl: url,
          method: 'PUT',
          objectKey: key,
          expiresInSeconds: 600,
          requiredHeaders: { 'content-type': request.body.contentType },
        },
      });
    },
  );

  typed.post(
    '/v1/admin/episodes/:id/media/:mediaId/complete-upload',
    {
      schema: {
        tags: ['Admin'],
        params: mediaAssetParamsSchema,
        response: { 202: mediaProcessingStatusResponseSchema, ...errorResponses },
      },
    },
    async (request, reply) => {
      requireAdmin(request);
      const { id: episodeId, mediaId } = request.params;
      const media = await prisma.mediaAsset.findFirst({
        where: { id: mediaId, episodeId },
        select: { id: true, sourceObjectKey: true, processingStatus: true },
      });
      if (!media) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Media asset not found for episode');
      }
      if (!media.sourceObjectKey) {
        throw new ApiHttpError(409, 'CONFLICT', 'Request an upload URL before completing upload');
      }
      if (media.processingStatus !== 'UPLOADED' && media.processingStatus !== 'FAILED') {
        throw new ApiHttpError(
          409,
          'CONFLICT',
          'Media upload has already been submitted for processing',
        );
      }

      let head;
      try {
        head = await clients.s3.send(
          new HeadObjectCommand({ Bucket: sourceBucket, Key: media.sourceObjectKey }),
        );
      } catch {
        throw new ApiHttpError(
          409,
          'CONFLICT',
          'Uploaded object was not found in the source bucket',
        );
      }
      if (!head.ContentLength || head.ContentLength > MAX_UPLOAD_BYTES) {
        throw new ApiHttpError(
          400,
          'VALIDATION_ERROR',
          'Uploaded video is empty or exceeds the 2 GB limit',
        );
      }
      if (head.ContentType !== 'video/mp4' && head.ContentType !== 'video/quicktime') {
        throw new ApiHttpError(
          400,
          'VALIDATION_ERROR',
          'Uploaded object has an unsupported content type',
        );
      }

      const claim = await prisma.mediaAsset.updateMany({
        where: { id: mediaId, processingStatus: { in: ['UPLOADED', 'FAILED'] } },
        data: { processingStatus: 'QUEUED' },
      });
      if (claim.count !== 1) {
        throw new ApiHttpError(409, 'CONFLICT', 'Media is already queued for processing');
      }

      const destination = hlsDestination(outputBucket, mediaId);
      try {
        const job = await clients.mediaConvert.send(
          new CreateJobCommand({
            Role: clients.mediaConvertRoleArn,
            UserMetadata: { mediaId, episodeId },
            Settings: {
              TimecodeConfig: { Source: 'ZEROBASED' },
              Inputs: [
                {
                  FileInput: `s3://${sourceBucket}/${media.sourceObjectKey}`,
                  AudioSelectors: {
                    'Audio Selector 1': { DefaultSelection: 'DEFAULT' },
                  },
                  VideoSelector: {},
                  TimecodeSource: 'ZEROBASED',
                },
              ],
              OutputGroups: [
                {
                  Name: 'HLS',
                  OutputGroupSettings: {
                    Type: 'HLS_GROUP_SETTINGS',
                    HlsGroupSettings: {
                      Destination: destination,
                      SegmentLength: 6,
                      MinSegmentLength: 0,
                      DirectoryStructure: 'SINGLE_DIRECTORY',
                      ManifestCompression: 'NONE',
                      OutputSelection: 'MANIFESTS_AND_SEGMENTS',
                    },
                  },
                  Outputs: [
                    {
                      NameModifier: '_720p',
                      ContainerSettings: { Container: 'M3U8' },
                      VideoDescription: {
                        Width: 1280,
                        Height: 720,
                        CodecSettings: {
                          Codec: 'H_264',
                          H264Settings: {
                            RateControlMode: 'QVBR',
                            QvbrSettings: { QvbrQualityLevel: 7 },
                            MaxBitrate: 5_000_000,
                          },
                        },
                      },
                      AudioDescriptions: [
                        {
                          CodecSettings: {
                            Codec: 'AAC',
                            AacSettings: {
                              Bitrate: 96_000,
                              CodingMode: 'CODING_MODE_2_0',
                              SampleRate: 48_000,
                            },
                          },
                        },
                      ],
                    },
                    {
                      NameModifier: '_360p',
                      ContainerSettings: { Container: 'M3U8' },
                      VideoDescription: {
                        Width: 640,
                        Height: 360,
                        CodecSettings: {
                          Codec: 'H_264',
                          H264Settings: {
                            RateControlMode: 'QVBR',
                            QvbrSettings: { QvbrQualityLevel: 7 },
                            MaxBitrate: 1_200_000,
                          },
                        },
                      },
                      AudioDescriptions: [
                        {
                          CodecSettings: {
                            Codec: 'AAC',
                            AacSettings: {
                              Bitrate: 64_000,
                              CodingMode: 'CODING_MODE_2_0',
                              SampleRate: 48_000,
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          }),
        );
        if (!job.Job?.Id) {
          throw new Error('missing_job_id');
        }
        const updated = await prisma.mediaAsset.update({
          where: { id: mediaId },
          data: { processingStatus: 'PROCESSING', processingJobId: job.Job.Id },
        });
        return reply.code(202).send({
          data: {
            mediaId,
            status: updated.processingStatus,
            jobStatus: job.Job.Status ?? null,
            playbackManifestUrl: updated.playbackManifestUrl,
          },
        });
      } catch (error) {
        await prisma.mediaAsset.update({
          where: { id: mediaId },
          data: { processingStatus: 'FAILED' },
        });
        request.log.error(
          { err: error, mediaId, requestId: request.id },
          'mediaconvert_create_job_failed',
        );
        throw new ApiHttpError(500, 'INTERNAL_ERROR', 'Unable to start media processing');
      }
    },
  );

  typed.get(
    '/v1/admin/episodes/:id/media/:mediaId/processing-status',
    {
      schema: {
        tags: ['Admin'],
        params: mediaAssetParamsSchema,
        response: { 200: mediaProcessingStatusResponseSchema, ...errorResponses },
      },
    },
    async (request) => {
      requireAdmin(request);
      const media = await prisma.mediaAsset.findFirst({
        where: { id: request.params.mediaId, episodeId: request.params.id },
        select: {
          id: true,
          processingStatus: true,
          processingJobId: true,
          playbackManifestUrl: true,
        },
      });
      if (!media) {
        throw new ApiHttpError(404, 'NOT_FOUND', 'Media asset not found for episode');
      }
      let jobStatus: string | null = null;
      if (media.processingJobId) {
        try {
          const result = await clients.mediaConvert.send(
            new GetJobCommand({ Id: media.processingJobId }),
          );
          jobStatus = result.Job?.Status ?? null;
        } catch (error) {
          request.log.error(
            { err: error, mediaId: media.id, requestId: request.id },
            'mediaconvert_get_job_failed',
          );
        }
      }
      return {
        data: {
          mediaId: media.id,
          status: media.processingStatus,
          jobStatus,
          playbackManifestUrl: media.playbackManifestUrl,
        },
      };
    },
  );
}
