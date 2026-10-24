import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Slot, ThemeProvider } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { AuthProvider } from '@/lib/auth-context';
import { LibraryProvider } from '@/lib/library-context';
import { createQueryClient } from '@/lib/query-client';

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Head>
          <title>Daiva Stories</title>
        </Head>
        <StatusBar style="light" />
        <ThemeProvider value={DarkTheme}>
          <AuthProvider>
            <LibraryProvider>
              <View style={styles.shell}>
                <AppHeader />
                <View style={styles.body}>
                  <Slot />
                </View>
              </View>
            </LibraryProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: '#140f0c',
  },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: '#140f0c',
  },
});
