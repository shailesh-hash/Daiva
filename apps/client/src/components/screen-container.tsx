import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useTheme } from '@/hooks/use-theme';

import { ThemedView } from './themed-view';

type ScreenContainerProps = {
  children: ReactNode;
  scroll?: boolean;
  edgeToEdge?: boolean;
};

export function ScreenContainer({
  children,
  scroll = true,
  edgeToEdge = false,
}: ScreenContainerProps) {
  const theme = useTheme();
  const desktop = useIsDesktop();
  const body = (
    <View style={edgeToEdge ? styles.bleed : [styles.inner, !desktop ? styles.innerMobile : null]}>
      {children}
    </View>
  );

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={edgeToEdge ? styles.scrollBleed : styles.scroll}
            keyboardShouldPersistTaps="handled"
            style={{ backgroundColor: theme.background, width: '100%' }}
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

export function useContentGutterStyle() {
  const desktop = useIsDesktop();
  return [contentGutter, desktop ? null : contentGutterMobile];
}

export const contentGutter = {
  width: '100%' as const,
  maxWidth: MaxContentWidth,
  alignSelf: 'center' as const,
  paddingHorizontal: Spacing.four,
};

const contentGutterMobile = {
  paddingHorizontal: Spacing.three,
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
  scroll: {
    flexGrow: 1,
    width: '100%',
    paddingBottom: Spacing.six,
  },
  scrollBleed: {
    flexGrow: 1,
    width: '100%',
    paddingBottom: Spacing.six,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.four,
  },
  innerMobile: {
    paddingHorizontal: Spacing.three,
  },
  bleed: {
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    gap: Spacing.five,
  },
});
