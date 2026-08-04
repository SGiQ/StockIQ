import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { resolveRef, type ResolvedRef } from '@/content/registry';
import type { EntityRef } from '@/content/types';
import { Chip, Text } from '@/components/primitives';
import { palette, space } from '@/theme/tokens';

const TONE = {
  trader: 'violet',
  strategy: 'mint',
  book: 'azure',
  term: 'flame',
  lesson: 'neutral',
} as const;

export interface RefChipsProps {
  title?: string;
  refs: EntityRef[];
}

/**
 * Renders EntityRefs as tappable chips.
 *
 * Unresolvable refs are dropped rather than rendered as dead chips — the
 * validator guarantees they resolve at build time, so a miss here means
 * content and code have drifted at runtime, and a silently shorter row is a
 * better failure than a chip that goes nowhere.
 */
export function RefChips({ title, refs }: RefChipsProps) {
  const router = useRouter();
  const resolved = refs
    .map(resolveRef)
    .filter((item): item is ResolvedRef => item !== undefined);

  if (resolved.length === 0) return null;

  return (
    <View style={styles.block}>
      {title && (
        <Text variant="label" color={palette.slate} uppercase>
          {title}
        </Text>
      )}
      <View style={styles.row}>
        {resolved.map((item) => (
          <Chip
            key={item.ref}
            label={item.title}
            tone={TONE[item.kind]}
            onPress={() => router.push(item.href as never)}
          />
        ))}
      </View>
    </View>
  );
}

/** Convenience wrappers so callers pass ids rather than building refs. */
export const traderRefs = (ids: string[]): EntityRef[] =>
  ids.map((id) => `trader:${id}` as EntityRef);
export const strategyRefs = (ids: string[]): EntityRef[] =>
  ids.map((id) => `strategy:${id}` as EntityRef);
export const bookRefs = (ids: string[]): EntityRef[] =>
  ids.map((id) => `book:${id}` as EntityRef);

const styles = StyleSheet.create({
  block: {
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
