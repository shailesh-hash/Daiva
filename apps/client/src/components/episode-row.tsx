import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ContinueCardWidth, MinTapTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CatalogueEpisode } from '@/lib/catalogue-types';
import { formatDuration } from '@/lib/format';

import { PosterTile } from './poster-tile';
import { ThemedText } from './themed-text';

type EpisodeRowProps = {
  episode: CatalogueEpisode;
  progressLabel?: string;
  progressRatio?: number;
  variant?: 'list' | 'rail';
};

export function EpisodeRow({
  episode,
  progressLabel,
  progressRatio,
  variant = 'list',
}: EpisodeRowProps) {
  const theme = useTheme();
  const clamped =
    typeof progressRatio === 'number' ? Math.min(1, Math.max(0, progressRatio)) : undefined;

  return (
    <Link
      href={{ pathname: '/episodes/[id]', params: { id: episode.id } }}
      accessibilityRole="link"
      accessibilityLabel={`Episode ${episode.episodeNumber}, ${episode.title}. Sample. ${formatDuration(episode.durationSeconds)}.`}
    >
      <View
        style={[
          variant === 'rail' ? styles.rail : styles.row,
          variant === 'list' ? { backgroundColor: theme.backgroundElement } : null,
        ]}
      >
        <PosterTile title={episode.title} variant={variant === 'rail' ? 'landscape' : 'thumb'} />
        <View style={styles.body}>
          <ThemedText type="smallBold" themeColor="warning">
            Episode {episode.episodeNumber}
          </ThemedText>
          <ThemedText type={variant === 'rail' ? 'smallBold' : 'heading'} numberOfLines={2}>
            {episode.title}
          </ThemedText>
          {variant === 'list' ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {episode.synopsis}
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {formatDuration(episode.durationSeconds)}
            {episode.captionsAvailable ? ' · Captions' : ''}
            {progressLabel ? ` · ${progressLabel}` : ''}
          </ThemedText>
          {typeof clamped === 'number' ? (
            <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.round(clamped * 100)}%`, backgroundColor: theme.accent },
                ]}
              />
            </View>
          ) : null}
        </View>
      </View>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MinTapTarget,
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  rail: {
    width: ContinueCardWidth,
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  track: {
    height: 3,
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
});
