import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
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
import { useHydrateStores } from '@/store/useHydrateStores';
import { useSync } from '@/store/useSync';
import { palette } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Progress, XP, and streak are read from storage once here so no screen
  // ever has to render a loading state for them.
  const storesHydrated = useHydrateStores();

  // Pushes what is dirty and pulls what changed elsewhere. A no-op when no
  // sync URL is configured, so a local-only build is unaffected.
  useSync(storesHydrated);

  const ready = (fontsLoaded || Boolean(fontError)) && storesHydrated;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
      {/*
        Wraps everything, so the full-screen player and the modals are bounded
        by the frame too. Nested inside SafeAreaProvider it would not be —
        modals render above the navigator and would escape the phone.
      */}
      <PhoneFrame>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.paperWarm },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="landing" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="course/[courseId]" />
          <Stack.Screen
            name="lesson/[courseId]/[lessonId]"
            options={{
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
              // The player owns its own exit; a stray back-swipe mid-lesson
              // would drop progress the learner did not mean to leave.
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
        </Stack>
      </SafeAreaProvider>
      </PhoneFrame>
      <Telemetry />
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}
