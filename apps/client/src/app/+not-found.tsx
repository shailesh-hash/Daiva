import { Link } from 'expo-router';

import { ScreenContainer } from '@/components/screen-container';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';

export default function NotFoundScreen() {
  return (
    <ScreenContainer>
      <ScreenState
        kind="error"
        title="Page not found"
        message="That route is not part of the Phase 2 sample browse experience."
      />
      <Link href="/" accessibilityRole="link">
        <ThemedText type="linkPrimary" themeColor="accent">
          Go to home
        </ThemedText>
      </Link>
    </ScreenContainer>
  );
}
