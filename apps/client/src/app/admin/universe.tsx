import type { AdminUniverse } from '@daiva/api-client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { AdminField } from '@/components/admin-field';
import { AdminGate } from '@/components/admin-gate';
import { AppButton } from '@/components/app-button';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { useAdminMutation, useAdminUniverseQuery } from '@/lib/admin-hooks';
import { getApiClient } from '@/lib/api-access';

export default function AdminUniverseScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existingId = typeof id === 'string' ? id : undefined;
  const query = useAdminUniverseQuery(existingId);

  return (
    <AdminGate>
      <ScreenContainer>
        <ThemedText type="title" accessibilityRole="header">
          {existingId ? 'Edit universe' : 'New universe'}
        </ThemedText>
        {existingId && query.isPending ? (
          <ScreenState
            kind="loading"
            title="Loading universe"
            message="Reading the admin record."
          />
        ) : query.isError ? (
          <ScreenState
            kind="error"
            title="Universe unavailable"
            message="That admin record could not be loaded."
          />
        ) : (
          <UniverseForm key={query.data?.id ?? 'new'} initial={query.data ?? null} />
        )}
      </ScreenContainer>
    </AdminGate>
  );
}

function UniverseForm({ initial }: { initial: AdminUniverse | null }) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<string>(initial?.status ?? 'DRAFT');
  const [error, setError] = useState<string | undefined>();
  const save = useAdminMutation(async () => {
    const client = getApiClient();
    if (initial) {
      return client.updateAdminUniverse(initial.id, {
        slug,
        title,
        description: description || null,
        status: status as AdminUniverse['status'],
      });
    }
    const created = await client.createAdminUniverse({
      slug,
      title,
      description: description || null,
      primaryLanguage: 'kn',
      isSampleContent: true,
    });
    router.replace(`/admin/universe?id=${created.id}`);
    return created;
  });

  return (
    <>
      {error ? <ScreenState kind="error" title="Save failed" message={error} /> : null}
      <AdminField label="Slug" value={slug} onChangeText={setSlug} placeholder="guru-daiva-dutta" />
      <AdminField label="Title" value={title} onChangeText={setTitle} />
      <AdminField label="Description" value={description} onChangeText={setDescription} multiline />
      {initial ? (
        <AdminField
          label="Status"
          value={status}
          onChangeText={setStatus}
          placeholder="DRAFT or PUBLISHED"
        />
      ) : null}
      <AppButton
        label={save.isPending ? 'Saving…' : 'Save universe'}
        disabled={save.isPending || slug.length === 0 || title.length === 0}
        onPress={() => {
          setError(undefined);
          save.mutate(undefined, {
            onError: () => setError('The API rejected this universe. Check the slug and status.'),
          });
        }}
      />
    </>
  );
}
