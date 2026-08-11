import { createElement, useEffect, useMemo, useState } from 'react';
import { Image, Platform, type ImageStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const WEB_ORIGIN = 'https://stockiq-delta.vercel.app';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const FILL: ImageStyle = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

export function IllustrationArt({
  source,
  alt,
  active,
  focalY,
  frameRatio = 1,
}: {
  source: string;
  alt: string;
  active: boolean;
  /** Vertical focal point (0 top … 1 bottom) that cover-cropping keeps in view. */
  focalY?: number;
  /** Aspect ratio of the frame the image fills; drives the crop maths. */
  frameRatio?: number;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active && !reduceMotion ? 0 : 1);
  const isWeb = Platform.OS === 'web';

  // React Native's Image has no object-position, so a controlled cover-crop is
  // built by hand: measure the source's natural ratio, size the image to
  // overflow the frame on one axis, then offset it so the focal band stays in
  // view. Until the measurement lands it falls back to a centred cover fill —
  // the old behaviour — so there is never a flash of an unfilled frame. Web
  // does this declaratively below and skips the measurement.
  const [ratio, setRatio] = useState<number | null>(null);

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

  const uri = isWeb ? source : `${WEB_ORIGIN}${source}`;
  const focal = clamp01(focalY ?? 0.5);

  useEffect(() => {
    if (isWeb) return;
    let alive = true;
    setRatio(null);
    Image.getSize(
      uri,
      (w, h) => {
        if (alive && h > 0) setRatio(w / h);
      },
      () => {
        // Leave ratio null; the centred cover fallback still renders the art.
      },
    );
    return () => {
      alive = false;
    };
  }, [uri, isWeb]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.65 + progress.value * 0.35,
    transform: [{ scale: 1.035 - progress.value * 0.035 }],
  }));

  const fit = useMemo<ImageStyle>(() => {
    if (!ratio) return FILL;
    if (ratio < frameRatio) {
      // Narrower than the frame: overflows vertically, so the focal point
      // chooses which horizontal band survives.
      const overflow = frameRatio / ratio - 1;
      return {
        position: 'absolute',
        left: 0,
        width: '100%',
        aspectRatio: ratio,
        top: `${-overflow * focal * 100}%`,
      };
    }
    // Wider than the frame: overflows horizontally; keep it centred.
    const overflow = ratio / frameRatio - 1;
    return {
      position: 'absolute',
      top: 0,
      height: '100%',
      aspectRatio: ratio,
      left: `${-overflow * 0.5 * 100}%`,
    };
  }, [ratio, frameRatio, focal]);

  // Web can position the cover-crop declaratively, so a plain <img> gives full
  // control over object-position and sidesteps the reanimated web adapter,
  // which could leave the generated image at its bootstrap opacity after a
  // static export.
  if (isWeb) {
    return createElement('img', {
      src: uri,
      alt,
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: `50% ${focal * 100}%`,
        display: 'block',
      },
    });
  }

  return (
    <Animated.Image
      source={{ uri }}
      accessibilityLabel={alt}
      resizeMode="cover"
      style={[fit, style]}
    />
  );
}
