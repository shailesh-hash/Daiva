import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EpisodeRow } from '@/components/episode-row';
import { SampleBanner } from '@/components/sample-banner';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenState } from '@/components/screen-state';
import { StoryGrid } from '@/components/story-grid';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { shouldUseCatalogueFixtures } from '@/lib/config';
import { formatDuration } from '@/lib/format';
import { useLibrarySnapshot, useLibraryStore } from '@/lib/library-context';
import { useFavoritesQuery, useProgressQuery } from '@/lib/user-hooks';

export default function LibraryScreen() {
  const auth = useAuth();
  const store = useLibraryStore();
  useLibrarySnapshot();
  const favoritesQuery = useFavoritesQuery();
  const progressQuery = useProgressQuery();
  const favorites = store.listFavoriteStories();
  const continueWatching = store.listContinueWatching();
  const requiresAuth = !shouldUseCatalogueFixtures();

  if (requiresAuth && auth.status === 'loading') {
    return (
      <ScreenContainer>
        <ScreenState kind="loading" title="Loading account" message="Restoring your session." />
      </ScreenContainer>
    );
  }

  if (requiresAuth && auth.status === 'signedOut') {
    return (
      <ScreenContainer>
        <ThemedText type="title" accessibilityRole="header">
          Library
        </ThemedText>
        <ScreenState
          kind="empty"
          title="Sign in to use your library"
          message="Favorites and continue watching are saved to your account. Browsing stays public."
        />
        <Link href="/sign-in" accessibilityRole="link">
          <ThemedText type="linkPrimary" themeColor="accent">
            Sign in
          </ThemedText>
        </Link>
      </ScreenContainer>
    );
  }

  if (requiresAuth && (favoritesQuery.isPending || progressQuery.isPending)) {
    return (
      <ScreenContainer>
        <ScreenState
          kind="loading"
          title="Loading library"
          message="Fetching your favorites and playback progress."
        />
      </ScreenContainer>
    );
  }

  if (requiresAuth && (favoritesQuery.isError || progressQuery.isError)) {
    return (
      <ScreenContainer>
        <ScreenState
          kind="error"
          title="Library unavailable"
          message="Your account library could not be loaded."
          actionLabel="Try again"
          onAction={() => {
            void favoritesQuery.refetch();
            void progressQuery.refetch();
          }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ThemedText type="title" accessibilityRole="header">
        Library
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        {requiresAuth
          ? 'Favorites and continue watching are stored for this signed-in account.'
          : 'Fixture catalogue mode is using local preview state only.'}
      </ThemedText>
      <SampleBanner />

      <View style={styles.section}>
        <ThemedText type="heading">Continue watching</ThemedText>
        {continueWatching.length === 0 ? (
          <ScreenState
            kind="empty"
            title="No in-progress sample episodes"
            message="Open a published sample episode to see it listed here. Completed episodes can be replayed from the story page."
          />
        ) : (
          continueWatching.map((item) => (
            <EpisodeRow
              key={item.episode.id}
              episode={item.episode}
              progressLabel={`Resume at ${formatDuration(item.progress.positionSeconds)}`}
              progressRatio={
                item.episode.durationSeconds > 0
                  ? item.progress.positionSeconds / item.episode.durationSeconds
                  : 0
              }
            />
          ))
        )}
      </View>

      <View style={styles.section}>
        <ThemedText type="heading">Favorites</ThemedText>
        {favorites.length === 0 ? (
          <ScreenState
            kind="empty"
            title="No favorite sample stories"
            message="Save a published story from its detail page."
          />
        ) : (
          <StoryGrid stories={favorites} />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
});
