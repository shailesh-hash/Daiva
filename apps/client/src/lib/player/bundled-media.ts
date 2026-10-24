import type { SampleMediaContentType } from './sample-source';
import { inferSampleContentType, resolveConfiguredSampleUri } from './sample-source';
import { SAMPLE_CAPTIONS_VTT } from './sample-captions';

const bundledVideo = require('../../../assets/sample/sample.mp4') as number | string;
const bundledPoster = require('../../../assets/sample/poster.png') as number | string;

export type ResolvedSampleSource = {
  sourceUri?: string;
  sourceAssetId?: number;
  posterUri?: string;
  posterAssetId?: number;
  captionsVtt: string;
  contentType: SampleMediaContentType;
};

function moduleToUri(value: number | string): { uri?: string; assetId?: number } {
  if (typeof value === 'string') {
    return { uri: value };
  }
  return { assetId: value };
}

export function resolveSampleSource(): ResolvedSampleSource {
  const configured = resolveConfiguredSampleUri(process.env.EXPO_PUBLIC_SAMPLE_VIDEO_URI);
  const video = configured ? { uri: configured } : moduleToUri(bundledVideo);
  const poster = moduleToUri(bundledPoster);
  const configuredPoster = resolveConfiguredSampleUri(process.env.EXPO_PUBLIC_SAMPLE_POSTER_URI);

  return {
    sourceUri: video.uri,
    sourceAssetId: video.assetId,
    posterUri: configuredPoster ?? poster.uri,
    posterAssetId: configuredPoster ? undefined : poster.assetId,
    captionsVtt: SAMPLE_CAPTIONS_VTT,
    contentType: configured ? inferSampleContentType(configured) : 'mp4',
  };
}
