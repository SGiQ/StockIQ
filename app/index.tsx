import { Redirect } from 'expo-router';
import { useAppStore } from '@/store/slices/useAppStore';

/**
 * The entry gate.
 *
 * Onboarding is required exactly once, and the thing that gates it is the
 * timestamped disclaimer acknowledgement rather than a generic "seen
 * onboarding" flag — for a finance app, "has this person been shown the
 * not-advice notice, and when" is the fact worth persisting.
 */
export default function Index() {
  const acknowledged = useAppStore((s) => s.profile?.disclaimerAcknowledgedAt ?? null);
  return <Redirect href={acknowledged ? '/(tabs)' : '/landing'} />;
}
