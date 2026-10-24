import { StyleSheet, TextInput } from 'react-native';

import { MinTapTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type AdminFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
};

export function AdminField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: AdminFieldProps) {
  const theme = useTheme();
  return (
    <>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
          },
        ]}
        value={value}
      />
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: MinTapTarget,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
    paddingVertical: Spacing.two,
  },
});
