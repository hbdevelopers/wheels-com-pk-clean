// mobile/app/_layout.tsx - COMPLETE with deep links, auth guard, push
import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../store/auth.store';
import NotificationsService from '../services/notifications.service';

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2, staleTime: 300000 } } });

function parseDeepLink(url: string): string | null {
  try { const { path } = Linking.parse(url); return path ? (path.startsWith('/') ? path : `/${path}`) : null; } catch { return null; }
}

function AuthGuard() {
  const segments = useSegments();
  const { isAuthenticated } = useAuthStore();
  useEffect(() => {
    const path = segments.join('/');
    const isProtected = ['listing/create','chat','referral','saved','edit-profile','cnic-verification'].some(r => path.includes(r));
    if (isProtected && !isAuthenticated) router.replace('/(auth)/login');
  }, [segments, isAuthenticated]);
  return null;
}

export default function RootLayout() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      if (isAuthenticated) await NotificationsService.registerForPushNotifications();
      const cleanup = NotificationsService.setupNotificationHandlers();
      await NotificationsService.getLastNotificationResponse();
      await SplashScreen.hideAsync();
      return cleanup;
    };
    const cleanupPromise = init();
    return () => { cleanupPromise.then(fn => fn && fn()); };
  }, [isAuthenticated]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => { const p = parseDeepLink(url); if (p) router.push(p as any); });
    Linking.getInitialURL().then(url => { if (url) { const p = parseDeepLink(url); if (p) setTimeout(() => router.push(p as any), 500); } });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" backgroundColor="#0A0A0B" />
          <AuthGuard />
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="(auth)/login" options={{ animation: 'fade' }} />
            <Stack.Screen name="(auth)/onboarding" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="listing/create" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
            <Stack.Screen name="listing/[id]" />
            <Stack.Screen name="chat/[id]" />
            <Stack.Screen name="auction/[id]" />
            <Stack.Screen name="dealer/[slug]" />
            <Stack.Screen name="user/[id]" />
            <Stack.Screen name="compare" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="price-trends" />
            <Stack.Screen name="vin-decoder" />
            <Stack.Screen name="calculators" />
            <Stack.Screen name="forum" />
            <Stack.Screen name="forum/post/[id]" />
            <Stack.Screen name="forum/new-post" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="reels" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="saved" />
            <Stack.Screen name="referral" />
            <Stack.Screen name="report" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="cnic-verification" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
