import type { PlayerEvent } from '@/lib/player/player-state';
import type { SampleMediaContentType } from '@/lib/player/sample-source';

export type VideoSurfaceCommand = {
  intent: 'play' | 'pause';
  seekToken: number;
  seekSeconds: number;
  muted: boolean;
  volume: number;
  captionsEnabled: boolean;
};

export type VideoSurfaceProps = {
  sourceUri?: string;
  sourceAssetId?: number;
  posterUri?: string;
  captionsVtt?: string;
  contentType: SampleMediaContentType;
  title: string;
  command: VideoSurfaceCommand;
  onEvent: (event: PlayerEvent) => void;
};
