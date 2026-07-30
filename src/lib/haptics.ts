/**
 * Haptics that can never break an interaction.
 *
 * expo-haptics is a no-op or an outright failure on web and on some Android
 * devices. Calling it directly inside a press handler means a platform that
 * cannot vibrate can swallow the actual action — the button lights up and
 * nothing happens. Everything routes through here so feedback is strictly
 * additive.
 */
import { Platform } from 'react-native';
import * as Expo from 'expo-haptics';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

const safely = (run: () => Promise<void>): void => {
  if (!supported) return;
  try {
    void run().catch(() => {});
  } catch {
    // Haptics are decorative; never let them surface to the user.
  }
};

export const tap = (): void => safely(() => Expo.impactAsync(Expo.ImpactFeedbackStyle.Light));

export const select = (): void => safely(() => Expo.selectionAsync());

export const success = (): void =>
  safely(() => Expo.notificationAsync(Expo.NotificationFeedbackType.Success));

export const failure = (): void =>
  safely(() => Expo.notificationAsync(Expo.NotificationFeedbackType.Error));

export const warn = (): void =>
  safely(() => Expo.notificationAsync(Expo.NotificationFeedbackType.Warning));

/** Correct/incorrect in one call, for quiz answer checking. */
export const verdict = (correct: boolean): void => (correct ? success() : failure());
