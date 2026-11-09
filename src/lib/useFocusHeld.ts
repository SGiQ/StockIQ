import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * A value that only updates while its screen is focused.
 *
 * Tabs stay mounted under a modal lesson, so the store changes while Home is
 * covered and any count-up would run unseen. Holding the value until focus
 * returns makes the animation play when the learner is actually looking.
 * `useFocusEffect` re-runs its callback on focus and whenever `value`
 * changes while focused, so a focused screen still tracks live updates.
 */
export function useFocusHeld<T>(value: T): T {
  const [held, setHeld] = useState(value);
  useFocusEffect(
    useCallback(() => {
      setHeld(value);
    }, [value]),
  );
  return held;
}
