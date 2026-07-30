import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useHydrateStores } from '@/store/useHydrateStores';
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

  const ready = (fontsLoaded || Boolean(fontError)) && storesHydrated;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.paperWarm },
          }}
        >
          <Stack.Screen name="index" />
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
          <Stack.Screen name="kb/strategy/[strategyId]" />
          <Stack.Screen name="kb/book/[bookId]/index" />
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
    </GestureHandlerRootView>
  );
}
