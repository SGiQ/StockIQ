import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const WEB_ORIGIN = 'https://stockiq-delta.vercel.app';

export function IllustrationArt({
  source,
  alt,
  active,
}: {
  source: string;
  alt: string;
  active: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active && !reduceMotion ? 0 : 1);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = reduceMotion
      ? 1
      : withTiming(1, {
          duration: 1100,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        });
  }, [active, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.65 + progress.value * 0.35,
    transform: [{ scale: 1.035 - progress.value * 0.035 }],
  }));

  const uri = Platform.OS === 'web' ? source : `${WEB_ORIGIN}${source}`;

  return (
    <Animated.Image
      source={{ uri }}
      accessibilityLabel={alt}
      resizeMode="cover"
      style={[styles.image, style]}
    />
  );
}

const styles = StyleSheet.create({ image: { width: '100%', height: '100%' } });
