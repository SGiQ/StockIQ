import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/primitives';
import { snapshot, MAX_HEARTS } from '@/features/hearts';
import type { HeartsValue } from '@/store/repository';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/** The save-action heart path, reused so hearts read as one shape app-wide. */
export const HEART_PATH =
  'M12 20.5C6.5 16.8 3 13.9 3 9.9A4.9 4.9 0 017.9 5c1.7 0 3.2.8 4.1 2.1A5 5 0 0116.1 5 4.9 4.9 0 0121 9.9c0 4-3.5 6.9-9 10.6z';

export function HeartIcon({
  size = 20,
  filled = true,
  color = palette.danger,
}: {
  size?: number;
  filled?: boolean;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={HEART_PATH}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export interface HeartPipsProps {
  state: HeartsValue | null;
  /** Recompute anchor; the player passes its render clock so this stays live. */
  now: number;
  onPress?: () => void;
}

/**
 * The lesson-header hearts indicator: a single heart plus the live count.
 *
 * A count rather than five pips keeps the header uncluttered and reads the same
 * on the narrowest phone. Tapping it opens the upsell — the header is itself a
 * conversion surface, exactly as the out-of-hearts overlay is.
 */
export function HeartPips({ state, now, onPress }: HeartPipsProps) {
  const colors = useColors();
  const count = state ? snapshot(state, now).count : MAX_HEARTS;
  const empty = count <= 0;
  const color = empty ? colors.slateLight : palette.danger;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`${count} of ${MAX_HEARTS} hearts remaining`}
      style={styles.wrap}
    >
      <HeartIcon size={18} filled={!empty} color={color} />
      <Text variant="label" color={color}>
        {String(count)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs + 2,
    paddingHorizontal: space.xs,
    paddingVertical: space.xxs,
    borderRadius: radius.pill,
  },
});
