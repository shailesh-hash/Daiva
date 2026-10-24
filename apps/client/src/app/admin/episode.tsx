import { ApiClientError, type AdminEpisode } from '@daiva/api-client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AdminField } from '@/components/admin-field';
import { AdminGate } from '@/components/admin-gate';
import { AppButton } from '@/components/app-button';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAdminEpisodeQuery, useAdminMutation, useAdminStoriesQuery } from '@/lib/admin-hooks';
import { getApiClient } from '@/lib/api-access';

export default function AdminEpisodeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existingId = typeof id === 'string' ? id : undefined;
  const query = useAdminEpisodeQuery(existingId);
  const stories = useAdminStoriesQuery();
  const defaultStoryId = query.data?.storyId ?? stories.data?.[0]?.id ?? '';

  return (
    <AdminGate>
      <ScreenContainer>
        <ThemedText type="title" accessibilityRole="header">
          {existingId ? 'Edit episode' : 'New episode'}
        </ThemedText>
        {existingId && query.isPending ? (
          <ScreenState kind="loading" title="Loading episode" message="Reading the admin record." />
        ) : query.isError ? (
          <ScreenState
            kind="error"
            title="Episode unavailable"
            message="That admin record could not be loaded."
          />
        ) : (
          <EpisodeForm
            key={`${query.data?.id ?? 'new'}:${defaultStoryId}:${query.data?.status ?? ''}:${query.data?.publication.blockers.join(',') ?? ''}`}
            initial={query.data ?? null}
            defaultStoryId={defaultStoryId}
          />
        )}
      </ScreenContainer>
    </AdminGate>
  );
}

function EpisodeForm({
  initial,
  defaultStoryId,
}: {
  initial: AdminEpisode | null;
  defaultStoryId: string;
}) {
  const router = useRouter();
  const [storyId, setStoryId] = useState(initial?.storyId ?? defaultStoryId);
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [synopsis, setSynopsis] = useState(initial?.synopsis ?? '');
  const [episodeNumber, setEpisodeNumber] = useState(String(initial?.episodeNumber ?? 1));
  const [rightsType, setRightsType] = useState('ORIGINAL');
  const [sourceDescription, setSourceDescription] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [error, setError] = useState<string | undefined>();
  const save = useAdminMutation(async () => {
    const client = getApiClient();
    if (initial) {
      return client.updateAdminEpisode(initial.id, {
        slug,
        title,
        synopsis: synopsis || null,
      });
    }
    const created = await client.createAdminEpisode({
      storyId,
      slug,
      title,
      synopsis: synopsis || null,
      episodeNumber: Number(episodeNumber) || 1,
      language: 'kn',
      isSampleContent: true,
    });
    router.replace(`/admin/episode?id=${created.id}`);
    return created;
  });
  const action = useAdminMutation(async (fn: () => Promise<unknown>) => fn());

  function run(fn: () => Promise<unknown>, failed: string): void {
    setError(undefined);
    action.mutate(fn, {
      onError: (caught) => {
        if (caught instanceof ApiClientError && caught.isConflict) {
          setError(caught.message);
          return;
        }
        setError(failed);
      },
    });
  }

  return (
    <>
      {error ? <ScreenState kind="error" title="Admin action failed" message={error} /> : null}
      <AdminField label="Story id" value={storyId} onChangeText={setStoryId} />
      <AdminField label="Slug" value={slug} onChangeText={setSlug} />
      <AdminField label="Title" value={title} onChangeText={setTitle} />
      <AdminField label="Synopsis" value={synopsis} onChangeText={setSynopsis} multiline />
      <AdminField label="Episode number" value={episodeNumber} onChangeText={setEpisodeNumber} />
      <AppButton
        label={save.isPending ? 'Saving…' : 'Save episode'}
        disabled={save.isPending || !storyId || !slug || !title}
        onPress={() => {
          setError(undefined);
          save.mutate(undefined, {
            onError: () => setError('The API rejected this episode metadata.'),
          });
        }}
      />

      {initial ? (
        <View style={{ gap: Spacing.three }}>
          <ThemedText type="heading">Publication blockers</ThemedText>
          <ThemedText themeColor="textSecondary">
            Status: {initial.status}. Media: {initial.media?.processingStatus ?? 'none'}.
          </ThemedText>
          {initial.publication.blockers.length === 0 ? (
            <ThemedText>All publish preconditions currently pass.</ThemedText>
          ) : (
            initial.publication.blockers.map((blocker) => (
              <ThemedText key={blocker} themeColor="textSecondary">
                • {blocker}
              </ThemedText>
            ))
          )}

          <AppButton
            label="Attach uploaded media metadata"
            variant="secondary"
            disabled={action.isPending}
            onPress={() =>
              run(
                () => getApiClient().createAdminEpisodeMedia(initial.id, {}),
                'Media metadata could not be created.',
              )
            }
          />
          <AppButton
            label="Mark media READY (local test only)"
            variant="secondary"
            disabled={action.isPending}
            onPress={() =>
              run(
                () => getApiClient().markAdminEpisodeMediaReady(initial.id),
                'Local mark-ready is disabled outside AUTH_MODE=test.',
              )
            }
          />
          <AdminField
            label="Rights type"
            value={rightsType}
            onChangeText={setRightsType}
            placeholder="ORIGINAL"
          />
          <AdminField
            label="Rights source"
            value={sourceDescription}
            onChangeText={setSourceDescription}
            multiline
          />
          <AppButton
            label="Record unapproved rights"
            variant="secondary"
            disabled={action.isPending || sourceDescription.length === 0}
            onPress={() =>
              run(
                () =>
                  getApiClient().createAdminEpisodeRights(initial.id, {
                    rightsType: rightsType as
                      'ORIGINAL' | 'COMMISSIONED' | 'LICENSED' | 'PUBLIC_DOMAIN',
                    sourceDescription,
                  }),
                'Rights could not be recorded. Attach media first.',
              )
            }
          />
          {initial.rights.map((rights) => (
            <AppButton
              key={rights.id}
              label={
                rights.approvedAt
                  ? `Rights ${rights.rightsType} approved`
                  : `Approve rights ${rights.rightsType}`
              }
              variant="secondary"
              disabled={action.isPending || Boolean(rights.approvedAt)}
              onPress={() =>
                run(
                  () => getApiClient().approveAdminEpisodeRights(initial.id, rights.id),
                  'Rights approval failed.',
                )
              }
            />
          ))}
          <AdminField
            label="Review notes"
            value={reviewNotes}
            onChangeText={setReviewNotes}
            multiline
          />
          <AppButton
            label="Submit for review"
            variant="secondary"
            disabled={action.isPending}
            onPress={() =>
              run(
                () => getApiClient().submitAdminEpisodeReview(initial.id, reviewNotes),
                'Submit review failed.',
              )
            }
          />
          <AppButton
            label="Approve review"
            variant="secondary"
            disabled={action.isPending}
            onPress={() =>
              run(
                () =>
                  getApiClient().reviewAdminEpisode(initial.id, {
                    decision: 'APPROVED',
                    notes: reviewNotes || null,
                  }),
                'Review failed.',
              )
            }
          />
          <AppButton
            label={initial.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
            disabled={action.isPending}
            onPress={() =>
              run(
                () =>
                  initial.status === 'PUBLISHED'
                    ? getApiClient().unpublishAdminEpisode(initial.id)
                    : getApiClient().publishAdminEpisode(initial.id),
                'Publish is blocked until review, rights, and READY media pass on the server.',
              )
            }
          />
        </View>
      ) : null}
    </>
  );
}
