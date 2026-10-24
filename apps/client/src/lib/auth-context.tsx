import { ApiClientError, type MeUser } from '@daiva/api-client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getApiClient, setAccessToken } from './api-access';
import { deleteAuthValue, readAuthValue, writeAuthValue } from './auth-token-store';
import { getClientAuthMode } from './config';

const ACCESS_TOKEN_KEY = 'accessToken';
const SUBJECT_KEY = 'subject';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthContextValue = {
  status: AuthStatus;
  user: MeUser | null;
  mode: ReturnType<typeof getClientAuthMode>;
  signInLocal: (subject: string) => Promise<void>;
  completeCognitoSession: (accessToken: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function persistSession(accessToken: string, subject?: string): Promise<MeUser> {
  setAccessToken(accessToken);
  await writeAuthValue(ACCESS_TOKEN_KEY, accessToken);
  if (subject) {
    await writeAuthValue(SUBJECT_KEY, subject);
  }
  return getApiClient().getMe();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<MeUser | null>(null);
  const mode = getClientAuthMode();

  const signOut = useCallback(async () => {
    setAccessToken(undefined);
    await deleteAuthValue(ACCESS_TOKEN_KEY);
    await deleteAuthValue(SUBJECT_KEY);
    setUser(null);
    setStatus('signedOut');
  }, []);

  const completeSession = useCallback(
    async (accessToken: string, subject?: string) => {
      try {
        const nextUser = await persistSession(accessToken, subject);
        setUser(nextUser);
        setStatus('signedIn');
      } catch (error) {
        if (error instanceof ApiClientError && error.isUnauthorized) {
          await signOut();
          return;
        }
        throw error;
      }
    },
    [signOut],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readAuthValue(ACCESS_TOKEN_KEY);
      if (!stored) {
        if (!cancelled) {
          setStatus('signedOut');
        }
        return;
      }
      try {
        await completeSession(stored);
      } catch {
        if (!cancelled) {
          await signOut();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [completeSession, signOut]);

  const signInLocal = useCallback(
    async (subject: string) => {
      const session = await getApiClient().createDevSession(subject);
      await completeSession(session.accessToken, subject);
    },
    [completeSession],
  );

  const value = useMemo(
    () => ({
      status,
      user,
      mode,
      signInLocal,
      completeCognitoSession: (accessToken: string) => completeSession(accessToken),
      signOut,
    }),
    [completeSession, mode, signInLocal, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
