import type { AdminStory } from '@daiva/api-client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { AdminField } from '@/components/admin-field';
import { AdminGate } from '@/components/admin-gate';
import { AppButton } from '@/components/app-button';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { useAdminMutation, useAdminStoryQuery, useAdminUniversesQuery } from '@/lib/admin-hooks';
import { getApiClient } from '@/lib/api-access';

export default function AdminStoryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existingId = typeof id === 'string' ? id : undefined;
  const query = useAdminStoryQuery(existingId);
  const universes = useAdminUniversesQuery();
  const defaultUniverseId = query.data?.universeId ?? universes.data?.[0]?.id ?? '';

  return (
    <AdminGate>
      <ScreenContainer>
        <ThemedText type="title" accessibilityRole="header">
          {existingId ? 'Edit story' : 'New story'}
        </ThemedText>
        {existingId && query.isPending ? (
          <ScreenState kind="loading" title="Loading story" message="Reading the admin record." />
        ) : query.isError ? (
          <ScreenState
            kind="error"
            title="Story unavailable"
            message="That admin record could not be loaded."
          />
        ) : universes.data && universes.data.length === 0 && !existingId ? (
          <ScreenState
            kind="empty"
            title="Create a universe first"
            message="Stories must belong to an existing universe."
          />
        ) : (
          <StoryForm
            key={`${query.data?.id ?? 'new'}:${defaultUniverseId}`}
            initial={query.data ?? null}
            defaultUniverseId={defaultUniverseId}
          />
        )}
      </ScreenContainer>
    </AdminGate>
  );
}

function StoryForm({
  initial,
  defaultUniverseId,
}: {
  initial: AdminStory | null;
  defaultUniverseId: string;
}) {
  const router = useRouter();
  const [universeId, setUniverseId] = useState(initial?.universeId ?? defaultUniverseId);
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [synopsis, setSynopsis] = useState(initial?.synopsis ?? '');
  const [status, setStatus] = useState<string>(initial?.status ?? 'DRAFT');
  const [error, setError] = useState<string | undefined>();
  const save = useAdminMutation(async () => {
    const client = getApiClient();
    if (initial) {
      return client.updateAdminStory(initial.id, {
        universeId,
        slug,
        title,
        synopsis: synopsis || null,
        status: status as AdminStory['status'],
      });
    }
    const created = await client.createAdminStory({
      universeId,
      slug,
      title,
      synopsis: synopsis || null,
      language: 'kn',
      sortOrder: 0,
      featured: false,
      isSampleContent: true,
    });
    router.replace(`/admin/story?id=${created.id}`);
    return created;
  });

  return (
    <>
      {error ? <ScreenState kind="error" title="Save failed" message={error} /> : null}
      <AdminField label="Universe id" value={universeId} onChangeText={setUniverseId} />
      <AdminField label="Slug" value={slug} onChangeText={setSlug} />
      <AdminField label="Title" value={title} onChangeText={setTitle} />
      <AdminField label="Synopsis" value={synopsis} onChangeText={setSynopsis} multiline />
      {initial ? <AdminField label="Status" value={status} onChangeText={setStatus} /> : null}
      <AppButton
        label={save.isPending ? 'Saving…' : 'Save story'}
        disabled={save.isPending || !universeId || !slug || !title}
        onPress={() => {
          setError(undefined);
          save.mutate(undefined, {
            onError: () => setError('The API rejected this story. Check the universe id and slug.'),
          });
        }}
      />
    </>
  );
}
