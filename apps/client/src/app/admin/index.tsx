import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AdminGate } from '@/components/admin-gate';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  useAdminAuditQuery,
  useAdminEpisodesQuery,
  useAdminStoriesQuery,
  useAdminUniversesQuery,
} from '@/lib/admin-hooks';

export default function AdminHomeScreen() {
  const universes = useAdminUniversesQuery();
  const stories = useAdminStoriesQuery();
  const episodes = useAdminEpisodesQuery();
  const audit = useAdminAuditQuery();

  return (
    <AdminGate>
      <ScreenContainer>
        <ThemedText type="title" accessibilityRole="header">
          Admin
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Server-side ADMIN_SUBJECTS controls access. Publishing still requires approved review,
          approved rights, and READY media.
        </ThemedText>
        <View style={styles.actions}>
          <Link href="/admin/universe" accessibilityRole="link">
            <ThemedText type="linkPrimary" themeColor="accent">
              New universe
            </ThemedText>
          </Link>
          <Link href="/admin/story" accessibilityRole="link">
            <ThemedText type="linkPrimary" themeColor="accent">
              New story
            </ThemedText>
          </Link>
          <Link href="/admin/episode" accessibilityRole="link">
            <ThemedText type="linkPrimary" themeColor="accent">
              New episode
            </ThemedText>
          </Link>
        </View>

        <Section
          title="Universes"
          loading={universes.isPending}
          error={universes.isError}
          empty={(universes.data?.length ?? 0) === 0}
          emptyMessage="No universes yet."
        >
          {universes.data?.map((item) => (
            <Link key={item.id} href={`/admin/universe?id=${item.id}`} accessibilityRole="link">
              <ThemedText type="linkPrimary" themeColor="accent">
                {item.title} · {item.status}
              </ThemedText>
            </Link>
          ))}
        </Section>

        <Section
          title="Stories"
          loading={stories.isPending}
          error={stories.isError}
          empty={(stories.data?.length ?? 0) === 0}
          emptyMessage="No stories yet."
        >
          {stories.data?.map((item) => (
            <Link key={item.id} href={`/admin/story?id=${item.id}`} accessibilityRole="link">
              <ThemedText type="linkPrimary" themeColor="accent">
                {item.title} · {item.status}
              </ThemedText>
            </Link>
          ))}
        </Section>

        <Section
          title="Episodes"
          loading={episodes.isPending}
          error={episodes.isError}
          empty={(episodes.data?.length ?? 0) === 0}
          emptyMessage="No episodes yet."
        >
          {episodes.data?.map((item) => (
            <Link key={item.id} href={`/admin/episode?id=${item.id}`} accessibilityRole="link">
              <ThemedText type="linkPrimary" themeColor="accent">
                {item.title} · {item.status}
                {item.publication.blockers.length > 0
                  ? ` · ${item.publication.blockers.length} blockers`
                  : ''}
              </ThemedText>
            </Link>
          ))}
        </Section>

        <Section
          title="Audit log"
          loading={audit.isPending}
          error={audit.isError}
          empty={(audit.data?.length ?? 0) === 0}
          emptyMessage="No admin actions recorded."
        >
          {audit.data?.slice(0, 12).map((item) => (
            <ThemedText key={item.id} type="small" themeColor="textSecondary">
              {item.action} · {item.entityType} · {item.actorSubject}
            </ThemedText>
          ))}
        </Section>
      </ScreenContainer>
    </AdminGate>
  );
}

function Section({
  title,
  loading,
  error,
  empty,
  emptyMessage,
  children,
}: {
  title: string;
  loading: boolean;
  error: boolean;
  empty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="heading">{title}</ThemedText>
      {loading ? (
        <ScreenState
          kind="loading"
          title={`Loading ${title.toLowerCase()}`}
          message="Reading admin records."
        />
      ) : error ? (
        <ScreenState
          kind="error"
          title={`${title} unavailable`}
          message="The admin API rejected this list."
        />
      ) : empty ? (
        <ScreenState kind="empty" title={`No ${title.toLowerCase()}`} message={emptyMessage} />
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
});
