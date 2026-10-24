import { StyleSheet, View } from 'react-native';

import { EpisodeRow } from '@/components/episode-row';
import { HeroBillboard } from '@/components/hero-billboard';
import { MediaRail } from '@/components/media-rail';
import { SampleBanner } from '@/components/sample-banner';
import { ScreenContainer, useContentGutterStyle } from '@/components/screen-container';
import { ScreenState } from '@/components/screen-state';
import { StoryRail } from '@/components/story-rail';
import { Spacing } from '@/constants/theme';
import { useStoriesQuery, useUniversesQuery } from '@/lib/catalogue-hooks';
import { formatDuration } from '@/lib/format';
import { useLibrarySnapshot, useLibraryStore } from '@/lib/library-context';

export default function HomeScreen() {
  const universesQuery = useUniversesQuery();
  const storiesQuery = useStoriesQuery();
  const store = useLibraryStore();
  useLibrarySnapshot();
  const gutter = useContentGutterStyle();
  const continueWatching = store.listContinueWatching();
  const universe = universesQuery.data?.[0];
  const stories = storiesQuery.data ?? [];
  const featured = stories.filter((story) => story.featured);
  const hero = featured[0] ?? stories[0];

  if (universesQuery.isPending || storiesQuery.isPending) {
    return (
      <ScreenContainer>
        <ScreenState
          kind="loading"
          title="Loading catalogue"
          message="Fetching published stories from the local API."
        />
      </ScreenContainer>
    );
  }

  if (universesQuery.isError || storiesQuery.isError) {
    return (
      <ScreenContainer>
        <ScreenState
          kind="error"
          title="Catalogue unavailable"
          message="The public catalogue could not be loaded. Unpublished drafts stay hidden."
          actionLabel="Try again"
          onAction={() => {
            void universesQuery.refetch();
            void storiesQuery.refetch();
          }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edgeToEdge>
      {hero ? <HeroBillboard story={hero} universeTitle={universe?.title} /> : null}
      <View style={[...gutter, styles.stack]}>
        <SampleBanner />

        {continueWatching.length > 0 ? (
          <MediaRail title="Continue watching">
            {continueWatching.map((item) => (
              <EpisodeRow
                key={item.episode.id}
                variant="rail"
                episode={item.episode}
                progressLabel={`Resume ${formatDuration(item.progress.positionSeconds)}`}
                progressRatio={
                  item.episode.durationSeconds > 0
                    ? item.progress.positionSeconds / item.episode.durationSeconds
                    : 0
                }
              />
            ))}
          </MediaRail>
        ) : null}

        {featured.length > 0 ? <StoryRail title="Featured" stories={featured} /> : null}

        {stories.length === 0 ? (
          <ScreenState
            kind="empty"
            title="No published stories"
            message="Draft and unpublished catalogue items stay hidden until rights, review, and READY media are in place."
          />
        ) : (
          <StoryRail title="All stories" stories={stories} />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.five,
    paddingTop: Spacing.four,
  },
});
