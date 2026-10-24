import { useWindowDimensions } from 'react-native';

import { Breakpoints } from '@/constants/theme';

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return width >= Breakpoints.desktop;
}
