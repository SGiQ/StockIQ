import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { ArtLabel as ArtLabelSpec, ArtLabelTone } from '@/content/types';
import { fontFamily } from '@/theme/tokens';

/**
 * A number from the narration, drawn over an illustration as crisp app text.
 * The chip is self-legible (solid fill + hairline + soft shadow) so it reads on
 * any part of the image, and is positioned by the spec's fractional centre so
 * it tracks whatever size the art box renders at.
 */
const TONES: Record<ArtLabelTone, { bg: string; fg: string }> = {
  green: { bg: '#2E8B6B', fg: '#F4EEE1' },
  rust: { bg: '#C0522F', fg: '#F4EEE1' },
  ochre: { bg: '#E0A82E', fg: '#3A2A08' },
  slate: { bg: '#41546B', fg: '#F4EEE1' },
  cream: { bg: '#F3ECDD', fg: '#20242C' },
};

export function ArtLabel({ label, active }: { label: ArtLabelSpec; active: boolean }) {
  const tone = TONES[label.tone ?? 'slate'];
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active && !reduceMotion ? 0 : 1);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = reduceMotion
      ? 1
      : withDelay(
          260,
          withTiming(1, {
            duration: 420,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.System,
          }),
        );
  }, [active, progress, reduceMotion]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || size.w !== width || size.h !== height) setSize({ w: width, h: height });
  };

  const entrance = useAnimatedStyle(() => ({
    opacity: size ? progress.value : 0,
    transform: [{ translateY: (1 - progress.value) * 4 }],
  }));

  // Centre the chip on its point once measured; hidden until then to avoid a
  // one-frame flash at the top-left corner.
  const placement = {
    left: `${label.x * 100}%` as const,
    top: `${label.y * 100}%` as const,
    marginLeft: size ? -size.w / 2 : 0,
    marginTop: size ? -size.h / 2 : 0,
    opacity: size ? 1 : 0,
  };

  const chip = (
    <>
      <View style={[styles.chip, { backgroundColor: tone.bg }]} onLayout={onLayout}>
        <Text style={[styles.text, { color: tone.fg }]} numberOfLines={1} allowFontScaling={false}>
          {label.text}
        </Text>
      </View>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.anchor, placement]} pointerEvents="none">
        {chip}
      </View>
    );
  }

  return (
    <Animated.View style={[styles.anchor, placement, entrance]} pointerEvents="none">
      {chip}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
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
  },
});
