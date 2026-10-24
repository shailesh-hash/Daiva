import type { VideoPlayer } from 'expo-video';

import type { VideoSurfaceCommand } from './video-surface-types';

export function applyNativePlayerCommand(
  player: VideoPlayer,
  command: VideoSurfaceCommand,
  lastSeekToken: { current: number },
): void {
  player.muted = command.muted;
  player.volume = command.volume;

  const tracks = player.availableSubtitleTracks;
  if (tracks.length > 0) {
    player.subtitleTrack = command.captionsEnabled ? (tracks[0] ?? null) : null;
  }

  if (command.seekToken !== lastSeekToken.current) {
    lastSeekToken.current = command.seekToken;
    player.currentTime = command.seekSeconds;
  }

  if (command.intent === 'play' && !player.playing) {
    player.play();
  }
  if (command.intent === 'pause' && player.playing) {
    player.pause();
  }
}
