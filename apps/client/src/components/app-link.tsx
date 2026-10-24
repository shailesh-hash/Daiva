import { Link, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MinTapTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type AppLinkProps = {
  href: Href;
  label: string;
  variant?: 'play' | 'primary' | 'secondary';
  accessibilityLabel?: string;
};

export function AppLink({ href, label, variant = 'primary', accessibilityLabel }: AppLinkProps) {
  const theme = useTheme();
  const play = variant === 'play';
  const primary = variant === 'primary';

  return (
    <Link href={href} accessibilityRole="link" accessibilityLabel={accessibilityLabel ?? label}>
      <View
        style={[
          styles.button,
          {
            backgroundColor: play ? '#ffffff' : primary ? theme.accent : theme.backgroundSelected,
          },
        ]}
      >
        <ThemedText
          type="smallBold"
          style={play ? styles.playLabel : undefined}
          themeColor={play ? 'text' : 'accentText'}
        >
          {label}
        </ThemedText>
      </View>
    </Link>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MinTapTarget,
    minWidth: MinTapTarget,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playLabel: {
    color: '#141414',
  },
});
