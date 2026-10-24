import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { applyNativePlayerCommand } from './apply-native-command';
import type { VideoSurfaceProps } from './video-surface-types';

export function VideoSurface({
  sourceUri,
  sourceAssetId,
  contentType,
  title,
  command,
  onEvent,
}: VideoSurfaceProps) {
  const lastSeekToken = useRef(0);
  const onEventRef = useRef(onEvent);
  const commandRef = useRef(command);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    commandRef.current = command;
  }, [command]);

  const source =
    sourceUri !== undefined
      ? {
          uri: sourceUri,
          contentType: contentType === 'hls' ? ('hls' as const) : ('auto' as const),
        }
      : sourceAssetId !== undefined
        ? sourceAssetId
        : null;

  const player = useVideoPlayer(source, (instance) => {
    instance.timeUpdateEventInterval = 0.5;
    instance.muted = commandRef.current.muted;
    instance.volume = commandRef.current.volume;
  });

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'loading') {
      onEventRef.current({ type: 'load' });
    }
    if (status === 'readyToPlay') {
      onEventRef.current({ type: 'ready', durationSeconds: player.duration });
    }
    if (status === 'error') {
      onEventRef.current({
        type: 'error',
        message: error?.message ?? 'Native sample playback failed.',
      });
    }
  });

  useEventListener(player, 'playingChange', ({ isPlaying }) => {
    onEventRef.current({ type: isPlaying ? 'playing' : 'pause' });
  });

  useEventListener(player, 'playToEnd', () => {
    onEventRef.current({ type: 'ended' });
  });

  useEventListener(player, 'timeUpdate', ({ currentTime, bufferedPosition }) => {
    onEventRef.current({
      type: 'progress',
      positionSeconds: currentTime,
      bufferedSeconds: bufferedPosition,
    });
  });

  useEffect(() => {
    applyNativePlayerCommand(player, command, lastSeekToken);
  }, [command, player]);

  return (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="contain"
      accessibilityLabel={`Sample video player for ${title}`}
      style={styles.fill}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
