import { ApiClient, ApiClientError } from '@daiva/api-client';
import type { HealthResponse } from '@daiva/domain';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getApiBaseUrl } from '@/lib/config';

type HealthState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; payload: HealthResponse }
  | { status: 'error'; message: string };

export default function HomeScreen() {
  const [health, setHealth] = useState<HealthState>({ status: 'idle' });

  const checkHealth = useCallback(async () => {
    setHealth({ status: 'loading' });
    const client = new ApiClient(getApiBaseUrl());

    try {
      const payload = await client.getHealth();
      setHealth({ status: 'ok', payload });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Unable to reach the API. Start it with pnpm dev:api.';
      setHealth({ status: 'error', message });
    }
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Daiva Stories
        </ThemedText>
        <ThemedText type="small" style={styles.subtitle}>
          Phase 1 scaffold. Catalogue, player, auth, and AI are not implemented yet.
        </ThemedText>
        <ThemedText type="small">API base URL: {getApiBaseUrl()}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Check API health"
          onPress={() => {
            void checkHealth();
          }}
          style={styles.button}
        >
          <ThemedText type="smallBold" style={styles.buttonLabel}>
            {health.status === 'loading' ? 'Checking…' : 'Check API health'}
          </ThemedText>
        </Pressable>
        {health.status === 'ok' ? (
          <ThemedText type="small">
            {health.payload.service} is {health.payload.status} (request {health.payload.requestId})
          </ThemedText>
        ) : null}
        {health.status === 'error' ? (
          <ThemedText type="small" style={styles.error}>
            {health.message}
          </ThemedText>
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  button: {
    minHeight: 44,
    minWidth: 160,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: '#ffffff',
  },
  error: {
    textAlign: 'center',
  },
});
