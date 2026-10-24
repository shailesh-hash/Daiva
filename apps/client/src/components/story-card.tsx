import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { RailCardWidth, Spacing } from '@/constants/theme';
import type { CatalogueStory } from '@/lib/catalogue-types';
import { formatDuration, formatLanguage } from '@/lib/format';

import { PosterTile } from './poster-tile';
import { ThemedText } from './themed-text';

type StoryCardProps = {
  story: CatalogueStory;
  variant?: 'rail' | 'grid';
};

export function StoryCard({ story, variant = 'grid' }: StoryCardProps) {
  return (
    <Link
      href={{ pathname: '/stories/[slug]', params: { slug: story.slug } }}
      accessibilityRole="link"
      accessibilityLabel={`${story.title}. Sample story. ${formatLanguage(story.language)}. ${formatDuration(story.durationSeconds)}.`}
    >
      <View style={[styles.card, variant === 'rail' ? styles.rail : styles.grid]}>
        <View style={styles.posterWrap}>
          <PosterTile title={story.title} variant="portrait" />
          {story.featured ? (
            <View style={styles.badge}>
              <ThemedText type="smallBold" themeColor="accentText">
                Featured
              </ThemedText>
            </View>
          ) : null}
        </View>
        <ThemedText type="smallBold" numberOfLines={2}>
          {story.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {formatLanguage(story.language)} · {formatDuration(story.durationSeconds)}
        </ThemedText>
      </View>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  rail: {
    width: RailCardWidth,
  },
  grid: {
    width: '100%',
  },
  posterWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    backgroundColor: '#e50914',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 4,
  },
});
