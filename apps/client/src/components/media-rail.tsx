import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';

type MediaRailProps = {
  title: string;
  children: ReactNode;
};

export function MediaRail({ title, children }: MediaRailProps) {
  return (
    <View style={styles.section}>
      <ThemedText type="heading">{title}</ThemedText>
      <View style={styles.scroller}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.row}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    maxWidth: '100%',
    gap: Spacing.three,
  },
  scroller: {
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  scroll: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingRight: Spacing.three,
  },
});
