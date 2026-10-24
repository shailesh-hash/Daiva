import { MediaConvertClient } from '@aws-sdk/client-mediaconvert';
import { S3Client } from '@aws-sdk/client-s3';

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function createMediaClients(env: NodeJS.ProcessEnv = process.env) {
  const region = required(env, 'AWS_REGION');
  const endpoint = required(env, 'MEDIACONVERT_ENDPOINT');
  return {
    s3: new S3Client({ region }),
    mediaConvert: new MediaConvertClient({ region, endpoint }),
    sourceBucket: required(env, 'MEDIA_SOURCE_BUCKET'),
    outputBucket: required(env, 'MEDIA_OUTPUT_BUCKET'),
    mediaConvertRoleArn: required(env, 'MEDIACONVERT_ROLE_ARN'),
    cdnDomain: required('CDN_DOMAIN').replace(/^https?:\/\//, '').replace(/\/$/, ''),
  };
}
