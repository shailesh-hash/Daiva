import { Platform, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useTheme } from '@/hooks/use-theme';
import type { CatalogueStory } from '@/lib/catalogue-types';
import { formatDuration, formatLanguage } from '@/lib/format';

import { AppLink } from './app-link';
import { PosterTile } from './poster-tile';
import { ThemedText } from './themed-text';

type HeroBillboardProps = {
  story: CatalogueStory;
  universeTitle?: string;
};

export function HeroBillboard({ story, universeTitle }: HeroBillboardProps) {
  const theme = useTheme();
  const desktop = useIsDesktop();

  const copy = (
    <View style={[styles.copy, desktop ? styles.copyDesktop : styles.copyMobile]}>
      <ThemedText type="smallBold" themeColor="warning">
        {universeTitle ?? 'Daiva Stories'}
      </ThemedText>
      <ThemedText
        type={desktop ? 'display' : 'title'}
        accessibilityRole="header"
        numberOfLines={3}
        style={desktop ? undefined : styles.mobileTitle}
      >
        {story.title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" numberOfLines={3} style={styles.synopsis}>
        {story.synopsis}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {formatLanguage(story.language)} · {formatDuration(story.durationSeconds)} · Sample
      </ThemedText>
      <View style={styles.actions}>
        <AppLink
          href={{ pathname: '/stories/[slug]', params: { slug: story.slug } }}
          label="Watch now"
          variant="play"
          accessibilityLabel={`Watch ${story.title}`}
        />
        <AppLink
          href={{ pathname: '/stories/[slug]', params: { slug: story.slug } }}
          label="More info"
          variant="secondary"
          accessibilityLabel={`More information about ${story.title}`}
        />
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.hero,
        desktop ? styles.heroDesktop : styles.heroMobile,
        { backgroundColor: theme.background },
      ]}
    >
      <View style={desktop ? styles.artDesktop : styles.artMobile}>
        <PosterTile title={story.title} variant="hero" mutedMonogram={!desktop} />
        {desktop ? (
          <View
            style={[
              styles.overlay,
              Platform.OS === 'web'
                ? ({
                    backgroundImage:
                      'linear-gradient(to top, #140f0c 8%, rgba(20,15,12,0.82) 42%, rgba(20,15,12,0.18) 100%)',
                  } as const)
                : { backgroundColor: theme.overlay },
            ]}
          />
        ) : null}
      </View>
      {desktop ? <View style={styles.desktopCopyWrap}>{copy}</View> : copy}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    maxWidth: '100%',
  },
  heroDesktop: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroMobile: {
    gap: Spacing.three,
  },
  artDesktop: {
    width: '100%',
  },
  artMobile: {
    width: '100%',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  desktopCopyWrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  copy: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.two,
  },
  copyDesktop: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  copyMobile: {
    paddingHorizontal: Spacing.three,
  },
  mobileTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 800,
  },
  synopsis: {
    maxWidth: 560,
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
