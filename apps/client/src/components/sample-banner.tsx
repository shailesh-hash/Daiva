import { StyleSheet, View } from 'react-native';

import { SAMPLE_CONTENT_DISCLAIMER } from '@/fixtures/catalog';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

export function SampleBanner() {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={SAMPLE_CONTENT_DISCLAIMER}
      style={[styles.banner, { backgroundColor: theme.warningBackground }]}
    >
      <ThemedText type="smallBold" themeColor="warning">
        Sample preview
      </ThemedText>
      <ThemedText type="small" themeColor="warning">
        {SAMPLE_CONTENT_DISCLAIMER}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    maxWidth: '100%',
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
