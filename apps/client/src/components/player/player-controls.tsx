import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { formatDuration } from '@/lib/format';
import type { PlayerSnapshot } from '@/lib/player/player-state';

type PlayerControlsProps = {
  snapshot: PlayerSnapshot;
  captionsAvailable: boolean;
  volumeSupported: boolean;
  onPlayPause: () => void;
  onSeekBy: (deltaSeconds: number) => void;
  onToggleMute: () => void;
  onVolumeBy: (delta: number) => void;
  onToggleCaptions: () => void;
};

export function PlayerControls({
  snapshot,
  captionsAvailable,
  volumeSupported,
  onPlayPause,
  onSeekBy,
  onToggleMute,
  onVolumeBy,
  onToggleCaptions,
}: PlayerControlsProps) {
  const playing = snapshot.phase === 'playing' || snapshot.phase === 'buffering';
  const position = formatDuration(Math.floor(snapshot.positionSeconds));
  const duration = formatDuration(Math.floor(snapshot.durationSeconds));

  return (
    <View style={styles.wrap}>
      <ThemedText type="small" themeColor="textSecondary">
        {position} / {duration}
        {snapshot.phase === 'buffering' ? ' · Buffering' : ''}
      </ThemedText>
      <View style={styles.row}>
        <AppButton label={playing ? 'Pause' : 'Play'} onPress={onPlayPause} />
        <AppButton
          label="Back 10s"
          variant="secondary"
          onPress={() => {
            onSeekBy(-10);
          }}
        />
        <AppButton
          label="Forward 10s"
          variant="secondary"
          onPress={() => {
            onSeekBy(10);
          }}
        />
      </View>
      <View style={styles.row}>
        <AppButton
          label={snapshot.muted ? 'Unmute' : 'Mute'}
          variant="secondary"
          onPress={onToggleMute}
        />
        {volumeSupported ? (
          <>
            <AppButton
              label="Volume down"
              variant="secondary"
              onPress={() => {
                onVolumeBy(-0.1);
              }}
            />
            <AppButton
              label="Volume up"
              variant="secondary"
              onPress={() => {
                onVolumeBy(0.1);
              }}
            />
          </>
        ) : null}
        {captionsAvailable ? (
          <AppButton
            label={snapshot.captionsEnabled ? 'Hide captions' : 'Show captions'}
            variant="secondary"
            onPress={onToggleCaptions}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
