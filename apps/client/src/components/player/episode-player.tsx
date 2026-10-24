import { Image } from 'expo-image';
import { useMemo, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolveSampleSource } from '@/lib/player/bundled-media';
import {
  createPlayerSnapshot,
  reducePlayerSnapshot,
  type PlayerEvent,
} from '@/lib/player/player-state';
import { isPlaybackComplete, shouldRecordProgress } from '@/lib/player/progress';

import { PlayerControls } from './player-controls';
import { VideoSurface } from './video-surface';

type EpisodePlayerProps = {
  episodeId: string;
  title: string;
  captionsAvailable: boolean;
  initialPositionSeconds?: number;
  onProgress: (positionSeconds: number, completed: boolean) => void;
};

export function EpisodePlayer({
  episodeId,
  title,
  captionsAvailable,
  initialPositionSeconds = 0,
  onProgress,
}: EpisodePlayerProps) {
  const theme = useTheme();
  const [snapshot, dispatch] = useReducer(reducePlayerSnapshot, undefined, createPlayerSnapshot);
  const [intent, setIntent] = useState<'play' | 'pause'>('pause');
  const [seek, setSeek] = useState({ token: 0, seconds: initialPositionSeconds });
  const lastRecorded = useRef(-1);
  const appliedResume = useRef(false);

  const resolved = useMemo(() => {
    try {
      return { source: resolveSampleSource(), error: undefined };
    } catch (error) {
      return {
        source: undefined,
        error: error instanceof Error ? error.message : 'Sample source is invalid.',
      };
    }
  }, []);
  const source = resolved.source;
  const sourceError = resolved.error;

  function onEvent(event: PlayerEvent): void {
    dispatch(event);

    if (event.type === 'ready' && !appliedResume.current && initialPositionSeconds > 0) {
      appliedResume.current = true;
      setSeek((current) => ({
        token: current.token + 1,
        seconds: Math.min(initialPositionSeconds, event.durationSeconds),
      }));
    }

    if (event.type === 'progress') {
      const completed = isPlaybackComplete(event.positionSeconds, snapshot.durationSeconds);
      if (completed || shouldRecordProgress(lastRecorded.current, event.positionSeconds)) {
        lastRecorded.current = event.positionSeconds;
        onProgress(event.positionSeconds, completed);
      }
    }

    if (event.type === 'ended') {
      setIntent('pause');
      onProgress(snapshot.durationSeconds, true);
    }
  }

  const showPoster =
    snapshot.phase === 'idle' ||
    snapshot.phase === 'ready' ||
    (snapshot.phase === 'paused' && snapshot.positionSeconds < 0.25) ||
    (snapshot.phase === 'loading' && intent === 'pause');

  return (
    <View style={[styles.frame, { backgroundColor: theme.backgroundElement }]}>
      <View
        accessibilityLabel={`Sample video player for ${title}`}
        style={[styles.stage, { backgroundColor: theme.background }]}
      >
        {source ? (
          <VideoSurface
            sourceUri={source.sourceUri}
            sourceAssetId={source.sourceAssetId}
            posterUri={source.posterUri}
            captionsVtt={captionsAvailable ? source.captionsVtt : undefined}
            contentType={source.contentType}
            title={title}
            command={{
              intent,
              seekToken: seek.token,
              seekSeconds: seek.seconds,
              muted: snapshot.muted,
              volume: snapshot.volume,
              captionsEnabled: snapshot.captionsEnabled,
            }}
            onEvent={onEvent}
          />
        ) : null}
        {showPoster && (source?.posterAssetId !== undefined || source?.posterUri) ? (
          <Image
            accessibilityIgnoresInvertColors
            contentFit="cover"
            source={source.posterAssetId ?? source.posterUri}
            style={styles.poster}
          />
        ) : null}
        {snapshot.phase === 'loading' || snapshot.phase === 'buffering' ? (
          <View style={styles.overlay} pointerEvents="none">
            <ActivityIndicator
              accessibilityLabel={
                snapshot.phase === 'buffering' ? 'Buffering sample video' : 'Loading sample video'
              }
              color={theme.accentText}
              size="large"
            />
            <ThemedText themeColor="accentText">
              {snapshot.phase === 'buffering' ? 'Buffering sample clip' : 'Loading sample clip'}
            </ThemedText>
          </View>
        ) : null}
      </View>
      {sourceError || snapshot.phase === 'error' ? (
        <ScreenState
          kind="error"
          title="Sample playback failed"
          message={
            sourceError ??
            snapshot.errorMessage ??
            'The sample clip could not be played. Video bytes are not fetched from the API.'
          }
        />
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Local sample clip. This is generated test media, not a Guru Daiva Dutta recording.
        </ThemedText>
      )}
      <PlayerControls
        snapshot={snapshot}
        captionsAvailable={captionsAvailable}
        volumeSupported={Platform.OS === 'web'}
        onPlayPause={() => {
          const next = intent === 'play' ? 'pause' : 'play';
          setIntent(next);
          dispatch({ type: next });
        }}
        onSeekBy={(deltaSeconds) => {
          const next = Math.max(
            0,
            Math.min(snapshot.durationSeconds || 4, snapshot.positionSeconds + deltaSeconds),
          );
          setSeek((current) => ({ token: current.token + 1, seconds: next }));
          dispatch({ type: 'progress', positionSeconds: next });
        }}
        onToggleMute={() => {
          dispatch({ type: 'mute', muted: !snapshot.muted });
        }}
        onVolumeBy={(delta) => {
          dispatch({ type: 'volume', volume: snapshot.volume + delta });
        }}
        onToggleCaptions={() => {
          dispatch({ type: 'captions', enabled: !snapshot.captionsEnabled });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  stage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  poster: {
    ...StyleSheet.absoluteFill,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(11, 11, 13, 0.55)',
  },
});
