import { Link, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MinTapTarget, Radius, Spacing } from '@/constants/theme';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useTheme } from '@/hooks/use-theme';
import { canSeeAdminUi } from '@/lib/admin-access';
import { useAuth } from '@/lib/auth-context';
import { isHeaderPathActive } from '@/lib/header-nav';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const links = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/library', label: 'Library' },
] as const;

const logoLetters = ['D', 'A', 'I', 'V', 'A'] as const;

function DaivaWordmark() {
  return (
    <View accessible accessibilityLabel="DAIVA" style={styles.logoRow}>
      {logoLetters.map((letter, index) => (
        <ThemedText key={`${letter}-${index}`} themeColor="accent" accessible={false} style={styles.logo}>
          {letter}
        </ThemedText>
      ))}
    </View>
  );
}

function HeaderNavItem({
  href,
  label,
  active,
  compact,
  onPress,
}: {
  href?: '/' | '/search' | '/library' | '/admin' | '/sign-in';
  label: string;
  active: boolean;
  compact?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const item = (
    <View
      style={[
        styles.navItem,
        compact ? styles.navItemCompact : null,
        active ? { backgroundColor: theme.navActive } : null,
      ]}
    >
      <ThemedText
        style={[
          styles.navLabel,
          { color: active ? theme.navActiveText : theme.text, fontWeight: 500 },
        ]}
      >
        {label}
      </ThemedText>
    </View>
  );

  if (href) {
    return (
      <Link
        href={href}
        accessibilityRole="link"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        style={[styles.navHit, { color: theme.text }]}
      >
        {item}
      </Link>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.navHit, pressed ? styles.pressed : null]}
    >
      {item}
    </Pressable>
  );
}

function AccountMark({ label }: { label: string }) {
  const theme = useTheme();
  const initial = label.trim().charAt(0).toUpperCase() || 'A';

  return (
    <View style={[styles.accountMark, { backgroundColor: theme.backgroundSelected }]} accessible={false}>
      <ThemedText type="smallBold" themeColor="accentText" style={styles.accountInitial}>
        {initial}
      </ThemedText>
    </View>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const desktop = useIsDesktop();
  const auth = useAuth();
  const signedIn = auth.status === 'signedIn';
  const accountLabel = signedIn ? 'Sign out' : 'Sign in';

  return (
    <ThemedView type="header" style={styles.header}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={[styles.inner, desktop ? styles.innerDesktop : styles.innerMobile]}>
          <Link href="/" accessibilityRole="link" accessibilityLabel="Daiva Stories home" style={styles.logoHit}>
            <DaivaWordmark />
          </Link>
          <View accessibilityRole="navigation" accessibilityLabel="Primary" style={styles.nav}>
            {[
              ...links,
              ...(canSeeAdminUi(auth.user) ? [{ href: '/admin' as const, label: 'Admin' }] : []),
            ].map((link) => (
              <HeaderNavItem
                key={link.href}
                href={link.href}
                label={link.label}
                compact={!desktop}
                active={isHeaderPathActive(pathname, link.href)}
              />
            ))}
          </View>
          <View style={styles.utilities}>
            {signedIn ? <AccountMark label="Account" /> : null}
            {signedIn ? (
              <HeaderNavItem
                label={accountLabel}
                compact={!desktop}
                active={false}
                onPress={() => {
                  void auth.signOut();
                }}
              />
            ) : (
              <HeaderNavItem
                href="/sign-in"
                label={accountLabel}
                compact={!desktop}
                active={isHeaderPathActive(pathname, '/sign-in')}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    maxWidth: '100%',
    overflow: 'visible',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(180deg, #0c0b0a 0%, #2a1c14 100%)',
      },
      default: {},
    }),
  },
  safe: {
    width: '100%',
    maxWidth: '100%',
  },
  inner: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    paddingVertical: 12,
  },
  innerDesktop: {
    paddingHorizontal: 36,
    gap: 28,
  },
  innerMobile: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  logoHit: {
    flexShrink: 0,
    marginRight: Spacing.three,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    overflow: 'visible',
    gap: 3,
  },
  logo: {
    fontFamily: Fonts.logo,
    fontSize: 16,
    lineHeight: 16,
    fontWeight: 400,
    letterSpacing: 0,
    marginHorizontal: 0,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  nav: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  utilities: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    flexShrink: 0,
    gap: Spacing.one,
  },
  navHit: {
    minHeight: MinTapTarget,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  navItem: {
    alignSelf: 'center',
    minHeight: 34,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navItemCompact: {
    paddingHorizontal: 10,
  },
  navLabel: {
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  accountMark: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInitial: {
    fontSize: 12,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.8,
  },
});
