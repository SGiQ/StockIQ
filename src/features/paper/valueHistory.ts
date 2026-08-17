import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ValueSnapshot {
  t: number;
  v: number;
}

const KEY = 'stockiq:paper-value:v1';
const MAX_SNAPSHOTS = 500;
const MIN_GAP_MS = 60_000;

export async function getSnapshots(): Promise<ValueSnapshot[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ValueSnapshot[];
  } catch {
    return [];
  }
}

export async function recordSnapshot(value: number): Promise<void> {
  const existing = await getSnapshots();
  const last = existing[existing.length - 1];
  if (last && Date.now() - last.t < MIN_GAP_MS) return;
  const snap: ValueSnapshot = { t: Date.now(), v: Math.round(value * 100) / 100 };
  const updated = [...existing, snap].slice(-MAX_SNAPSHOTS);
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
}

export async function clearSnapshots(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
