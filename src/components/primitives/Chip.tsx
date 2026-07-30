import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { palette, radius, space } from '@/theme/tokens';

export type ChipTone = 'neutral' | 'violet' | 'mint' | 'azure' | 'flame' | 'dark';

const TONES: Record<ChipTone, { bg: string; fg: string; border?: string }> = {
  neutral: { bg: palette.paper, fg: palette.ink, border: palette.hairline },
  violet: { bg: palette.violet, fg: palette.paper },
  mint: { bg: palette.mint, fg: palette.forestInk },
  azure: { bg: palette.azure, fg: palette.paper },
  flame: { bg: palette.flame, fg: palette.paper },
  dark: { bg: palette.ink, fg: palette.paper },
};

export interface ChipProps {
  label: string;
  tone?: ChipTone;
  selected?: boolean;
  onPress?: () => void;
  /** Small caps styling — used for sticker labels and unit banners. */
  compact?: boolean;
  style?: ViewStyle;
}

/**
 * The rounded label used for Explore categories, sticker reveals, and
 * cross-link chips. Selection swaps the tone rather than adding a ring, the
 * way Imprint's category filters do.
 */
export function Chip({
  label,
  tone = 'neutral',
  selected = false,
  onPress,
  compact = false,
  style,
}: ChipProps) {
  const resolved = selected && tone === 'neutral' ? TONES.dark : TONES[tone];
  const content = (
    <View
      style={[
        styles.base,
        compact ? styles.compact : null,
        {
          backgroundColor: resolved.bg,
          borderColor: resolved.border ?? 'transparent',
          borderWidth: resolved.border ? 1 : 0,
        },
        style,
      ]}
    >
      <Text
        variant={compact ? 'label' : 'bodySm'}
        color={resolved.fg}
        uppercase={compact}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={6}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    alignSelf: 'flex-start',
  },
  compact: {
    paddingVertical: space.xs + 2,
    paddingHorizontal: space.sm + 2,
  },
});
