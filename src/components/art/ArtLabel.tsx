import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import type { ArtLabel as ArtLabelSpec, ArtLabelTone } from '@/content/types';
import { fontFamily } from '@/theme/tokens';

/**
 * A number from the narration, drawn over an illustration as crisp app text.
 * The chip is a uniform pill (solid fill + hairline + soft shadow, one size
 * family) so a row of them reads as one system, positioned by the spec's
 * fractional centre so it tracks whatever size the art box renders at. On
 * entry each chip springs up from small, staggered in reading order.
 */
const TONES: Record<ArtLabelTone, { bg: string; fg: string }> = {
  green: { bg: '#2E8B6B', fg: '#F4EEE1' },
  rust: { bg: '#C0522F', fg: '#F4EEE1' },
  ochre: { bg: '#E0A82E', fg: '#3A2A08' },
  slate: { bg: '#41546B', fg: '#F4EEE1' },
  cream: { bg: '#F3ECDD', fg: '#20242C' },
};

const SPRING = { damping: 11, stiffness: 180, mass: 0.7, reduceMotion: ReduceMotion.System };

export function ArtLabel({
  label,
  active,
  index = 0,
}: {
  label: ArtLabelSpec;
  active: boolean;
  index?: number;
}) {
  const tone = TONES[label.tone ?? 'slate'];
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = reduceMotion ? 1 : withDelay(140 + index * 90, withSpring(1, SPRING));
  }, [active, index, progress, reduceMotion]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || size.w !== width || size.h !== height) setSize({ w: width, h: height });
  };

  const entrance = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: size ? (p < 1 ? p : 1) : 0,
      transform: [{ scale: 0.55 + p * 0.45 }],
    };
  });

  // Centre the chip on its point once measured; hidden until then to avoid a
  // one-frame flash at the top-left corner.
  const placement = {
    left: `${label.x * 100}%` as const,
    top: `${label.y * 100}%` as const,
    marginLeft: size ? -size.w / 2 : 0,
    marginTop: size ? -size.h / 2 : 0,
  };

  return (
    <Animated.View style={[styles.anchor, placement, entrance]} pointerEvents="none">
      <View style={[styles.chip, { backgroundColor: tone.bg }]} onLayout={onLayout}>
        <Text style={[styles.text, { color: tone.fg }]} numberOfLines={1} allowFontScaling={false}>
          {label.text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
  },
  chip: {
    minWidth: 38,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  text: {
    fontFamily: fontFamily.displayBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
});
