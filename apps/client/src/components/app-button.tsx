import { Pressable, StyleSheet } from 'react-native';

import { MinTapTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  accessibilityLabel?: string;
};

export function AppButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  accessibilityLabel,
}: AppButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? theme.accent : theme.backgroundSelected,
          opacity: disabled ? 0.5 : pressed ? 0.86 : 1,
        },
      ]}
    >
      <ThemedText type="smallBold" themeColor={primary ? 'accentText' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    minHeight: MinTapTarget,
    minWidth: MinTapTarget,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
