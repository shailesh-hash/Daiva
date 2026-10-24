import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'display'
    | 'title'
    | 'heading'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 700,
  },
  title: {
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 40,
  },
  display: {
    fontSize: 48,
    fontWeight: 800,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: 600,
  },
  link: {
    lineHeight: 22,
    fontSize: 16,
  },
  linkPrimary: {
    lineHeight: 22,
    fontSize: 16,
    fontWeight: 700,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
