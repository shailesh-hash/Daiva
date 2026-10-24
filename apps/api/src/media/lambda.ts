import { S3Client } from '@aws-sdk/client-s3';

import { createPrismaClient } from '../db/prisma.js';
import { handleMediaConvertEvent, type MediaConvertEvent } from './mediaconvert-event.js';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function handler(event: MediaConvertEvent): Promise<{ ok: true }> {
  const region = required('AWS_REGION');
  const outputBucket = required('MEDIA_OUTPUT_BUCKET');
  const prisma = createPrismaClient();
  const s3 = new S3Client({ region });
  try {
    await handleMediaConvertEvent(event, {
      prisma,
      s3,
      outputBucket,
      cdnDomain: required('CDN_DOMAIN').replace(/^https?:\\/\\//, '').replace(/\\/$/, ''),
    });
    return { ok: true };
  } finally {
    await prisma.$disconnect();
  }
}
