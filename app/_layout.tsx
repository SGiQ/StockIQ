import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { PhoneFrame } from '@/components/PhoneFrame';
import { Telemetry } from '@/components/Telemetry';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { useAppStore } from '@/store/slices/useAppStore';
import { useHydrateStores } from '@/store/useHydrateStores';
import { useSync } from '@/store/useSync';
import { ThemeProvider, useColors, useIsDark } from '@/theme/ThemeProvider';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.2,
});

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const colors = useColors();
  const isDark = useIsDark();
  // The same gate `index` applies, but at the navigator: every learner-facing
  // screen is reachable by URL, so a direct link to /(tabs) or a lesson must
  // not skip the disclaimer. The stores are hydrated before this mounts, so the
  // flag is real, not a pre-hydration null. With the guard down, a blocked
  // route lands on the anchor (`index`), which redirects to /landing.
  const acknowledged = useAppStore((s) => Boolean(s.profile?.disclaimerAcknowledgedAt));
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paperWarm },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="landing" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Protected guard={acknowledged}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="course/[courseId]" />
        <Stack.Screen
          name="lesson/[courseId]/[lessonId]"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="card/[courseId]/[lessonId]/[cardId]"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="kb/index" />
        <Stack.Screen name="kb/trader/[traderId]" />
        <Stack.Screen name="kb/strategy/[strategyId]/index" />
        <Stack.Screen
          name="kb/strategy/[strategyId]/guide"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="kb/book/[bookId]/index" />
        <Stack.Screen name="kb/glossary" />
        <Stack.Screen
          name="kb/term/[termId]/index"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="settings/index" />
        <Stack.Screen name="settings/narration" />
        <Stack.Screen name="settings/devices" />
        <Stack.Screen name="badges" />
        <Stack.Screen name="assessment" />
        <Stack.Screen name="review" />
        <Stack.Screen name="streak" />
        <Stack.Screen name="ask" />
        <Stack.Screen name="watchlist/index" />
        <Stack.Screen name="watchlist/[symbol]" />
        <Stack.Screen name="portfolio" />
        <Stack.Screen name="leagues" />
        <Stack.Screen name="this-week/index" />
        <Stack.Screen
          name="this-week/[noteId]"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="kb/book/[bookId]/guide"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            gestureEnabled: false,
          }}
        />
        </Stack.Protected>
      </Stack>
    </>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const storesHydrated = useHydrateStores();
  useSync(storesHydrated);

  const ready = (fontsLoaded || Boolean(fontError)) && storesHydrated;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
      <AppErrorBoundary>
      <PhoneFrame>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
      </PhoneFrame>
      <Telemetry />
      </AppErrorBoundary>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Sentry's wrapper adds the touch-event breadcrumb boundary and the React
// profiler around the whole tree; unhandled errors and promise rejections are
// caught by the global handlers `Sentry.init` installs above.
export default Sentry.wrap(RootLayout);
