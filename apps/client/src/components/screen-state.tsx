import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppButton } from './app-button';
import { ThemedText } from './themed-text';

type ScreenStateProps = {
  title: string;
  message: string;
  kind?: 'loading' | 'empty' | 'error';
  actionLabel?: string;
  onAction?: () => void;
};

export function ScreenState({
  title,
  message,
  kind = 'empty',
  actionLabel,
  onAction,
}: ScreenStateProps) {
  const theme = useTheme();

  return (
    <View accessibilityLiveRegion={kind === 'loading' ? 'polite' : undefined} style={styles.wrap}>
      {kind === 'loading' ? (
        <ActivityIndicator
          accessibilityLabel="Loading catalogue"
          color={theme.accent}
          size="large"
        />
      ) : null}
      <ThemedText type="heading" themeColor={kind === 'error' ? 'warning' : 'text'}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary">{message}</ThemedText>
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    alignItems: 'flex-start',
    maxWidth: 560,
  },
});
