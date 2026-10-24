import { StyleSheet, View } from 'react-native';

import { RailCardWidth, Spacing } from '@/constants/theme';
import type { CatalogueStory } from '@/lib/catalogue-types';

import { StoryCard } from './story-card';

type StoryGridProps = {
  stories: CatalogueStory[];
};

export function StoryGrid({ stories }: StoryGridProps) {
  return (
    <View style={styles.grid}>
      {stories.map((story) => (
        <View key={story.id} style={styles.item}>
          <StoryCard story={story} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  item: {
    width: RailCardWidth,
    maxWidth: '100%',
  },
});
