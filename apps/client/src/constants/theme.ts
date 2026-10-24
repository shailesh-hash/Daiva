import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#f5f5f5',
    background: '#140f0c',
    backgroundElement: '#241910',
    backgroundSelected: '#33251c',
    textSecondary: '#c4b8ae',
    accent: '#e50914',
    accentText: '#ffffff',
    warning: '#f5c518',
    warningBackground: '#2a2208',
    poster: '#2a1c16',
    border: '#3d2c22',
    overlay: 'rgba(20, 15, 12, 0.72)',
    navActive: '#e6e4e1',
    navActiveText: '#1a1410',
    header: '#1c1410',
  },
  dark: {
    text: '#f5f5f5',
    background: '#140f0c',
    backgroundElement: '#241910',
    backgroundSelected: '#33251c',
    textSecondary: '#c4b8ae',
    accent: '#e50914',
    accentText: '#ffffff',
    warning: '#f5c518',
    warningBackground: '#2a2208',
    poster: '#2a1c16',
    border: '#3d2c22',
    overlay: 'rgba(20, 15, 12, 0.72)',
    navActive: '#e6e4e1',
    navActiveText: '#1a1410',
    header: '#1c1410',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
    logo: 'AvenirNext-Heavy',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    logo: 'sans-serif-black',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-display)',
    rounded: 'var(--font-display)',
    mono: 'var(--font-mono)',
    logo: 'var(--font-logo)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

export const Breakpoints = {
  desktop: 840,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1280;
export const MinTapTarget = 44;
export const RailCardWidth = 156;
export const ContinueCardWidth = 260;
