/**
 * The browse UI is cinematic-dark on every platform, matching a streaming
 * catalogue rather than following the OS light/dark setting.
 */

import { Colors } from '@/constants/theme';

export function useTheme() {
  return Colors.dark;
}
