import { ApiClientError } from '@daiva/api-client';
import { Link, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useRef } from 'react';

import { EpisodePlayer } from '@/components/player/episode-player';
import { SampleBanner } from '@/components/sample-banner';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth-context';
import { useEpisodeQuery, useStoryQuery } from '@/lib/catalogue-hooks';
import { listStaticEpisodeParams } from '@/lib/catalog';
import { formatDuration, formatLanguage } from '@/lib/format';
import { useLibrarySnapshot, useLibraryStore } from '@/lib/library-context';
import { shouldPersistRemoteProgress } from '@/lib/player/progress';
import { useProgressMutation } from '@/lib/user-hooks';

export function generateStaticParams() {
  return listStaticEpisodeParams();
}

export default function EpisodePlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useLibraryStore();
  useLibrarySnapshot();
  const auth = useAuth();
  const progressMutation = useProgressMutation();
  const lastPersisted = useRef(-1);
  const latestProgress = useRef<{
    episodeId: string;
    positionSeconds: number;
    completed: boolean;
  } | null>(null);
  const episodeQuery = useEpisodeQuery(typeof id === 'string' ? id : undefined);

  useEffect(() => {
    return () => {
      const pending = latestProgress.current;
      if (pending && auth.status === 'signedIn') {
        progressMutation.mutate(pending);
      }
    };
  }, [auth.status, progressMutation]);
  const episode = episodeQuery.data;
  const storyQuery = useStoryQuery(episode?.storySlug);
  const story = storyQuery.data;
  const saved = typeof id === 'string' ? store.getProgress(id) : undefined;

  if (typeof id !== 'string' || episodeQuery.isPending || (episode && storyQuery.isPending)) {
    return (
      <ScreenContainer>
        <ScreenState
          kind="loading"
          title="Loading sample episode"
          message="Reading the published catalogue."
        />
      </ScreenContainer>
    );
  }

  if (episodeQuery.isError || !episode || storyQuery.isError || !story) {
    const notFound =
      (episodeQuery.error instanceof ApiClientError && episodeQuery.error.isNotFound) ||
      (storyQuery.error instanceof ApiClientError && storyQuery.error.isNotFound);
    return (
      <ScreenContainer>
        <ScreenState
          kind="error"
          title={notFound ? 'Sample episode not found' : 'Episode unavailable'}
          message={
            notFound
              ? 'This episode is missing or unpublished.'
              : 'The episode could not be loaded from the API.'
          }
          actionLabel={notFound ? undefined : 'Try again'}
          onAction={
            notFound
              ? undefined
              : () => {
                  void episodeQuery.refetch();
                  void storyQuery.refetch();
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
        <title>{`${episode.title} · Daiva Stories`}</title>
      </Head>
      <ThemedText type="title" accessibilityRole="header">
        {episode.title}
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        {story.title} · Episode {episode.episodeNumber} · {formatLanguage(episode.language)} ·{' '}
        {formatDuration(episode.durationSeconds)}
      </ThemedText>
      <SampleBanner />
      <EpisodePlayer
        key={episode.id}
        episodeId={episode.id}
        title={episode.title}
        captionsAvailable={episode.captionsAvailable}
        initialPositionSeconds={saved && !saved.completed ? saved.positionSeconds : 0}
        onProgress={(positionSeconds, completed) => {
          latestProgress.current = { episodeId: episode.id, positionSeconds, completed };
          store.recordProgress(episode.id, positionSeconds, completed);
          if (
            auth.status === 'signedIn' &&
            shouldPersistRemoteProgress(lastPersisted.current, positionSeconds, completed)
          ) {
            lastPersisted.current = positionSeconds;
            progressMutation.mutate({
              episodeId: episode.id,
              positionSeconds,
              completed,
            });
          }
        }}
      />
      <ThemedText>{episode.synopsis}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {episode.captionsAvailable
          ? 'Sample captions are available on the local test clip. They are not a verified translation.'
          : 'This sample episode has no caption file yet.'}
      </ThemedText>
      <Link
        href={{ pathname: '/stories/[slug]', params: { slug: story.slug } }}
        accessibilityRole="link"
      >
        <ThemedText type="linkPrimary" themeColor="accent">
          Back to {story.title}
        </ThemedText>
      </Link>
    </ScreenContainer>
  );
}
