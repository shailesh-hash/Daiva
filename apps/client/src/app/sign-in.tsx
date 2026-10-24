import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ScreenContainer } from '@/components/screen-container';
import { ScreenState } from '@/components/screen-state';
import { ThemedText } from '@/components/themed-text';
import { MinTapTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { getCognitoPublicConfig } from '@/lib/config';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const theme = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const [subject, setSubject] = useState('dev:local-user');
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const cognito = auth.mode === 'cognito' ? getCognitoPublicConfig() : undefined;
  const discovery = cognito
    ? {
        authorizationEndpoint: `https://${cognito.domain}/oauth2/authorize`,
        tokenEndpoint: `https://${cognito.domain}/oauth2/token`,
        revocationEndpoint: `https://${cognito.domain}/oauth2/revoke`,
      }
    : null;
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: cognito?.clientId ?? 'unconfigured',
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      scopes: ['openid', 'email', 'profile'],
      redirectUri: cognito?.redirectUri ?? 'http://localhost:8081/sign-in',
    },
    discovery,
  );

  useEffect(() => {
    if (auth.status === 'signedIn') {
      router.replace(auth.user?.isAdmin ? '/admin' : '/library');
    }
  }, [auth.status, auth.user?.isAdmin, router]);

  useEffect(() => {
    const codeVerifier = request?.codeVerifier;
    const authCode = response?.type === 'success' ? response.params.code : undefined;
    if (response?.type !== 'success' || !cognito || !codeVerifier || !authCode) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setPending(true);
      setError(undefined);
      try {
        const tokenResponse = await fetch(`https://${cognito.domain}/oauth2/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: cognito.clientId,
            code: authCode,
            redirect_uri: cognito.redirectUri,
            code_verifier: codeVerifier,
          }).toString(),
        });
        const payload = (await tokenResponse.json()) as { access_token?: string };
        if (!tokenResponse.ok || !payload.access_token) {
          throw new Error('Cognito did not return an access token');
        }
        await auth.completeCognitoSession(payload.access_token);
      } catch {
        if (!cancelled) {
          setError('Sign-in failed. The access token was rejected or the provider is unavailable.');
        }
      } finally {
        if (!cancelled) {
          setPending(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth, cognito, request?.codeVerifier, response]);

  async function onLocalSignIn(): Promise<void> {
    setPending(true);
    setError(undefined);
    try {
      await auth.signInLocal(subject.trim());
    } catch {
      setError('Local sign-in failed. Confirm the API is in AUTH_MODE=test.');
    } finally {
      setPending(false);
    }
  }

  return (
    <ScreenContainer>
      <ThemedText type="title" accessibilityRole="header">
        Sign in
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        Browse stays public. Sign in only to save favorites and resume playback on this account.
      </ThemedText>
      {error ? <ScreenState kind="error" title="Authentication error" message={error} /> : null}
      {auth.mode === 'cognito' ? (
        <AppButton
          label={pending ? 'Signing in…' : 'Continue with Cognito'}
          disabled={pending || !request}
          onPress={() => {
            void promptAsync();
          }}
        />
      ) : (
        <View style={styles.local}>
          <ThemedText type="small" themeColor="textSecondary">
            Local development uses a signed test token from the API. This is not a password and is
            disabled when AUTH_MODE=cognito. Use `dev:admin` only when that subject is in
            ADMIN_SUBJECTS.
          </ThemedText>
          <TextInput
            accessibilityLabel="Local identity label"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSubject}
            placeholder="dev:local-user"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.backgroundElement,
              },
            ]}
            value={subject}
          />
          <AppButton
            label={pending ? 'Signing in…' : 'Continue locally'}
            disabled={pending || subject.trim().length === 0}
            onPress={() => {
              void onLocalSignIn();
            }}
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  local: {
    gap: Spacing.three,
  },
  input: {
    minHeight: MinTapTarget,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
});
