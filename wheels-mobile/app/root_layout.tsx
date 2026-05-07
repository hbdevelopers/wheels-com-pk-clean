// mobile/app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../store/auth.store';
import NotificationsService from '../services/notifications.service';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
  },
});

export default function RootLayout() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Register for push notifications after auth
    if (isAuthenticated) {
      NotificationsService.registerForPushNotifications();
    }
    // Set up notification tap handlers (deep links)
    const cleanup = NotificationsService.setupNotificationHandlers();
    // Handle notification that launched the app from killed state
    NotificationsService.getLastNotificationResponse();

    SplashScreen.hideAsync();
    return cleanup;
  }, [isAuthenticated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" backgroundColor="#0A0A0B" />
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="listing/[id]" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
            <Stack.Screen name="chat/[id]" />
            <Stack.Screen name="auction/[id]" />
            <Stack.Screen name="dealer/[slug]" />
            <Stack.Screen name="listing/create" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
