import { ApiClientError } from '@daiva/api-client';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { StyleSheet, View } from 'react-native';

import { AppLink } from '@/components/app-link';
import { EpisodeRow } from '@/components/episode-row';
import { FavoriteButton } from '@/components/favorite-button';
import { PosterTile } from '@/components/poster-tile';
import { SampleBanner } from '@/components/sample-banner';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useAuth } from '@/lib/auth-context';
import { useStoryEpisodesQuery, useStoryQuery } from '@/lib/catalogue-hooks';
import { listStaticStoryParams } from '@/lib/catalog';
import { formatDuration, formatLanguage } from '@/lib/format';
import { useLibrarySnapshot, useLibraryStore } from '@/lib/library-context';
import { useFavoriteMutation } from '@/lib/user-hooks';

export function generateStaticParams() {
  return listStaticStoryParams();
}

export default function StoryDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const store = useLibraryStore();
  useLibrarySnapshot();
  const auth = useAuth();
  const router = useRouter();
  const desktop = useIsDesktop();
  const favoriteMutation = useFavoriteMutation();
  const storyQuery = useStoryQuery(typeof slug === 'string' ? slug : undefined);
  const episodesQuery = useStoryEpisodesQuery(typeof slug === 'string' ? slug : undefined);
  const story = storyQuery.data;
  const episodes = episodesQuery.data ?? [];
  const firstEpisode = episodes[0];

  if (typeof slug !== 'string' || storyQuery.isPending || episodesQuery.isPending) {
    return (
      <ScreenContainer>
        <ScreenState
          kind="loading"
          title="Loading sample story"
          message="Reading the published catalogue."
        />
      </ScreenContainer>
    );
  }

  if (storyQuery.isError || !story) {
    const notFound = storyQuery.error instanceof ApiClientError && storyQuery.error.isNotFound;
    return (
      <ScreenContainer>
        <ScreenState
          kind="error"
          title={notFound ? 'Sample story not found' : 'Story unavailable'}
          message={
            notFound
              ? 'That link is not in the published catalogue. Draft stories are hidden on purpose.'
              : 'The story could not be loaded from the API.'
          }
          actionLabel={notFound ? undefined : 'Try again'}
          onAction={
            notFound
              ? undefined
              : () => {
                  void storyQuery.refetch();
                  void episodesQuery.refetch();
                }
          }
        />
        <Link href="/" accessibilityRole="link">
          <ThemedText type="linkPrimary" themeColor="accent">
            Go to home
          </ThemedText>
        </Link>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Head>
        <title>{`${story.title} · Daiva Stories`}</title>
      </Head>
      <View style={[styles.hero, desktop ? styles.heroDesktop : null]}>
        <View style={desktop ? styles.posterDesktop : styles.posterMobile}>
          <PosterTile title={story.title} variant="portrait" />
        </View>
        <View style={styles.copy}>
          <ThemedText type="title" accessibilityRole="header">
            {story.title}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{story.synopsis}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatLanguage(story.language)} · {formatDuration(story.durationSeconds)} ·{' '}
            {story.contentNote}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {story.tags.join(' · ')}
          </ThemedText>
          <View style={styles.actions}>
            {firstEpisode ? (
              <AppLink
                href={{ pathname: '/episodes/[id]', params: { id: firstEpisode.id } }}
                label="Play"
                variant="play"
                accessibilityLabel={`Play ${story.title}`}
              />
            ) : null}
            <FavoriteButton
              storyTitle={story.title}
              isFavorite={store.isFavorite(story.id)}
              onToggle={() => {
                if (auth.status !== 'signedIn') {
                  router.push('/sign-in');
                  return;
                }
                const next = !store.isFavorite(story.id);
                store.toggleFavorite(story.id);
                favoriteMutation.mutate({ storyId: story.id, favorite: next });
              }}
            />
          </View>
        </View>
      </View>
      <SampleBanner />
      <View style={styles.section}>
        <ThemedText type="heading">Episodes</ThemedText>
        {episodesQuery.isError ? (
          <ScreenState
            kind="error"
            title="Episodes unavailable"
            message="Published episode metadata could not be loaded."
            actionLabel="Try again"
            onAction={() => {
              void episodesQuery.refetch();
            }}
          />
        ) : episodes.length === 0 ? (
          <ScreenState
            kind="empty"
            title="No published episodes"
            message="This story has no public READY episodes yet."
          />
        ) : (
          episodes.map((episode) => <EpisodeRow key={episode.id} episode={episode} />)
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: Spacing.four,
  },
  heroDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  posterMobile: {
    width: '100%',
    maxWidth: 220,
  },
  posterDesktop: {
    width: 220,
  },
  copy: {
    flex: 1,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
    alignItems: 'center',
  },
  section: {
    gap: Spacing.three,
  },
});
