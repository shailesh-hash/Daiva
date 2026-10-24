export const HLS_MASTER_PLAYLIST = 'main.m3u8';

export function sourceObjectKey(mediaId: string): string {
  return `uploads/${mediaId}/source`;
}

export function outputPrefix(mediaId: string): string {
  return `episodes/${mediaId}/`;
}

export function expectedMasterKey(mediaId: string): string {
  return `${outputPrefix(mediaId)}${HLS_MASTER_PLAYLIST}`;
}

export function playbackUrlForKey(
  objectKey: string,
  cdnDomain?: string,
  outputBucket?: string,
): string {
  if (cdnDomain) {
    return `https://${cdnDomain}/${objectKey}`;
  }
  if (!outputBucket) {
    throw new Error('Output bucket is required when CDN_DOMAIN is not set');
  }
  return `s3://${outputBucket}/${objectKey}`;
}

export type MediaConvertDetail = {
  status?: string;
  jobId?: string;
  userMetadata?: { mediaId?: string; episodeId?: string };
  outputGroupDetails?: Array<{
    type?: string;
    playlistFilePaths?: string[];
    outputDetails?: Array<{ outputFilePaths?: string[] }>;
  }>;
  errorMessage?: string;
};

export function objectKeyFromS3Uri(uri: string, bucket: string): string | null {
  const prefix = `s3://${bucket}/`;
  if (!uri.startsWith(prefix)) {
    return null;
  }
  return uri.slice(prefix.length);
}

export function resolveMasterObjectKey(
  detail: MediaConvertDetail,
  mediaId: string,
  outputBucket: string,
): string {
  const playlists =
    detail.outputGroupDetails?.flatMap((group) => group.playlistFilePaths ?? []) ?? [];
  for (const uri of playlists) {
    const key = objectKeyFromS3Uri(uri, outputBucket);
    if (key && key.startsWith(outputPrefix(mediaId)) && key.endsWith('.m3u8')) {
      return key;
    }
  }
  return expectedMasterKey(mediaId);
}
