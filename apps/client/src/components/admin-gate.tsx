import { Link } from 'expo-router';
import type { ReactNode } from 'react';

import { useAuth } from '@/lib/auth-context';

import { ScreenContainer } from './screen-container';
import { ScreenState } from './screen-state';
import { ThemedText } from './themed-text';

export function AdminGate({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return (
      <ScreenContainer>
        <ScreenState
          kind="loading"
          title="Checking admin access"
          message="Reading the signed-in role from the API."
        />
      </ScreenContainer>
    );
  }

  if (auth.status !== 'signedIn') {
    return (
      <ScreenContainer>
        <ScreenState
          kind="error"
          title="Sign in required"
          message="Admin tools are only available after a signed-in admin session."
        />
        <Link href="/sign-in" accessibilityRole="link">
          <ThemedText type="linkPrimary" themeColor="accent">
            Sign in
          </ThemedText>
        </Link>
      </ScreenContainer>
    );
  }

  if (!auth.user?.isAdmin) {
    return (
      <ScreenContainer>
        <ScreenState
          kind="error"
          title="Admin access required"
          message="This account is not on the server ADMIN_SUBJECTS allowlist. Hiding this screen is not a security control."
        />
      </ScreenContainer>
    );
  }

  return <>{children}</>;
}
