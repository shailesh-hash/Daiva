const BLOCKED_HOSTS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'tiktok.com',
  'instagram.com',
  'facebook.com',
  'fb.com',
  'twitter.com',
  'x.com',
  'dailymotion.com',
];

export type SampleMediaContentType = 'mp4' | 'hls';

export function inferSampleContentType(uri: string): SampleMediaContentType {
  return uri.split('?')[0]?.toLowerCase().endsWith('.m3u8') ? 'hls' : 'mp4';
}

export function isLocalSampleMediaUri(uri: string): boolean {
  const trimmed = uri.trim();
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('asset:') ||
    trimmed.startsWith('data:')
  ) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1')
    );
  } catch {
    return false;
  }
}

export function assertAllowedSampleMediaUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) {
    throw new Error('Sample media URI is empty.');
  }

  if (isLocalSampleMediaUri(trimmed)) {
    return trimmed;
  }

  let host = '';
  try {
    host = new URL(trimmed).hostname.toLowerCase();
  } catch {
    throw new Error('Sample media URI is not a valid local path or localhost URL.');
  }

  if (BLOCKED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) {
    throw new Error('Third-party video hosts are not allowed for the sample player.');
  }

  throw new Error(
    'Remote sample video hosts are not allowed. Use the bundled clip or a localhost URI.',
  );
}

export function resolveConfiguredSampleUri(envUri: string | undefined): string | undefined {
  const trimmed = envUri?.trim();
  if (!trimmed) {
    return undefined;
  }

  return assertAllowedSampleMediaUri(trimmed);
}
