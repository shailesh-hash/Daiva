import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { posterMonogram, posterPalette } from '@/lib/poster-palette';

import { ThemedText } from './themed-text';

type PosterTileProps = {
  title: string;
  compact?: boolean;
  mutedMonogram?: boolean;
  variant?: 'hero' | 'portrait' | 'landscape' | 'thumb';
};

export function PosterTile({
  title,
  compact = false,
  mutedMonogram = false,
  variant,
}: PosterTileProps) {
  const palette = posterPalette(title);
  const initial = posterMonogram(title);
  const shape = variant ?? (compact ? 'thumb' : 'landscape');

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.poster, styles[shape], { backgroundColor: palette.background }]}
    >
      <View style={[styles.wash, { backgroundColor: palette.accent }]} />
      <View style={[styles.glow, { backgroundColor: palette.accent }]} />
      <ThemedText
        type={shape === 'hero' && !mutedMonogram ? 'display' : 'heading'}
        style={[styles.initial, mutedMonogram ? styles.mutedInitial : null]}
      >
        {initial}
      </ThemedText>
      <View style={[styles.bar, { backgroundColor: palette.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  poster: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wash: {
    ...StyleSheet.absoluteFill,
    opacity: 0.18,
  },
  glow: {
    position: 'absolute',
    width: '80%',
    height: '60%',
    borderRadius: 999,
    opacity: 0.42,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
  },
  initial: {
    color: '#ffffff',
  },
  mutedInitial: {
    opacity: 0.35,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 0,
  },
  landscape: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
  },
  portrait: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: Radius.md,
  },
  thumb: {
    width: 88,
    height: 56,
    borderRadius: Radius.sm,
  },
});
