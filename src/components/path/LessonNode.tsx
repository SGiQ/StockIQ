import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Glyph } from '@/components/art/Glyph';
import { Text } from '@/components/primitives';
import type { GlyphName } from '@/content/types';
import type { LessonNodeStatus } from '@/store/slices/useAppStore';
import { easeOutCubic, easeOutQuad } from '@/lib/easing';
import { palette, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

export interface LessonNodeProps {
  lessonId: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  status: LessonNodeStatus;
  starred?: boolean;
  isCurrent?: boolean;
  onPress: () => void;
  /**
   * Returning from a lesson: 'completed' draws this node's line forward over
   * ~600 ms; 'next' draws its line after that and pulses the station once.
   * Undefined renders the resting state, which is also what reduced motion
   * gets.
   */
  reveal?: 'completed' | 'next';
}

/** How long the completed node's line takes to draw. */
const LINE_DRAW_MS = 600;

const categoryFor = (id: string): string => {
  if (id.includes('candle') || id.includes('chart') || id.includes('trend')) return 'Chart reading';
  if (id.includes('exchange') || id.includes('spread') || id.includes('order')) return 'Market structure';
  if (id.includes('share') || id.includes('stock')) return 'Core concept';
  if (id.includes('cash') || id.includes('revenue') || id.includes('margin')) return 'Business quality';
  if (id.includes('cap') || id.includes('ratio') || id.includes('quote')) return 'Valuation metrics';
  if (id.includes('risk') || id.includes('loss') || id.includes('stop')) return 'Risk control';
  if (id.includes('bias') || id.includes('fear') || id.includes('revenge')) return 'Investor behavior';
  return 'Market lesson';
};

const glyphFor = (id: string): GlyphName => {
  if (id.includes('candle')) return 'candle';
  if (id.includes('price') || id.includes('trend') || id.includes('momentum')) return 'chart-up';
  if (id.includes('exchange') || id.includes('spread') || id.includes('order')) return 'exchange';
  if (id.includes('share') || id.includes('stock') || id.includes('diversif')) return 'pie';
  if (id.includes('cash') || id.includes('revenue') || id.includes('earning')) return 'coins-stack';
  if (id.includes('risk') || id.includes('loss') || id.includes('stop')) return 'shield';
  if (id.includes('bias') || id.includes('fear') || id.includes('revenge')) return 'brain';
  return 'building';
};

export function LessonNode({
  lessonId,
  title,
  summary,
  estimatedMinutes,
  status,
  starred,
  isCurrent,
  onPress,
  reveal,
}: LessonNodeProps) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const locked = status === 'locked';
  const completed = status === 'completed';
  const animate = reveal !== undefined && !reduceMotion;

  // The green line is drawn as a scaleY from the top over the grey one, so a
  // reveal is transform-only; at rest it simply covers the track.
  const draw = useSharedValue(animate ? 0 : 1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!animate) {
      draw.value = 1;
      return;
    }
    draw.value = 0;
    if (reveal === 'completed') {
      draw.value = withTiming(1, { duration: LINE_DRAW_MS, easing: easeOutCubic, reduceMotion: ReduceMotion.System });
    } else {
      draw.value = withDelay(
        LINE_DRAW_MS,
        withTiming(1, { duration: 400, easing: easeOutCubic, reduceMotion: ReduceMotion.System }),
      );
      pulse.value = withDelay(
        LINE_DRAW_MS + 120,
        withSequence(
          withTiming(1.12, { duration: 200, easing: easeOutQuad, reduceMotion: ReduceMotion.System }),
          withTiming(1, { duration: 260, easing: easeOutQuad, reduceMotion: ReduceMotion.System }),
        ),
      );
    }
  }, [animate, reveal, draw, pulse]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: draw.value }] }));
  const stationStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={[styles.row, isCurrent && styles.currentRow]}>
      <View style={[styles.line, styles.lineLocked]} />
      {completed || isCurrent ? (
        <Animated.View style={[styles.line, styles.lineComplete, lineStyle]} />
      ) : null}
      <Animated.View
        style={[
          styles.station,
          { borderColor: colors.paperWarm },
          completed && styles.stationComplete,
          isCurrent && [styles.stationCurrent, { borderColor: colors.paper }],
          locked && styles.stationLocked,
          stationStyle,
        ]}
      >
        <Glyph
          name={completed ? 'check' : locked ? 'lock' : glyphFor(lessonId)}
          size={isCurrent ? 25 : 20}
          color={completed || isCurrent ? colors.paper : colors.slateLight}
          strokeWidth={2.3}
        />
      </Animated.View>

      {isCurrent ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Continue ${title}`}
          accessibilityState={{ selected: true }}
          style={({ pressed }) => [styles.currentCard, shadow.card, pressed && styles.pressed]}
        >
          <View style={styles.currentMeta}>
            <View style={styles.continueChip}>
              <Text variant="label" color={colors.paper} uppercase>Continue</Text>
            </View>
            <Text variant="label" color={colors.slate} uppercase>{`${estimatedMinutes} min`}</Text>
          </View>
          <Text variant="h2" color={palette.forestInk}>{title}</Text>
          <Text variant="bodySm" color={colors.inkSoft} numberOfLines={3}>{summary}</Text>
          <View style={styles.resumeButton}>
            <Text variant="label" color={colors.paper} uppercase>Resume journey</Text>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M5 12h13m-5-5 5 5-5 5" fill="none" stroke={colors.paper} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
        </Pressable>
      ) : (
        <Pressable
          onPress={onPress}
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ disabled: locked }}
          style={({ pressed }) => [styles.compactStop, pressed && !locked && styles.pressed]}
        >
          <Text variant="h3" color={locked ? colors.slateLight : completed ? colors.slate : colors.ink}>{title}</Text>
          <View style={styles.categoryRow}>
            <Glyph name={locked ? 'lock' : glyphFor(lessonId)} size={16} color={locked ? colors.slateLight : colors.slate} />
            <Text variant="label" color={locked ? colors.slateLight : colors.slate} uppercase>
              {completed && starred ? `${categoryFor(lessonId)} · Starred` : categoryFor(lessonId)}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'relative', minHeight: 112, paddingLeft: 70, paddingRight: space.xs, paddingBottom: space.lg },
  currentRow: { minHeight: 286 },
  line: { position: 'absolute', left: 25, top: 0, bottom: 0, width: 4, transformOrigin: 'top' },
  lineComplete: { backgroundColor: palette.emeraldDeep },
  lineLocked: { backgroundColor: '#D8DED9' },
  station: { position: 'absolute', left: 8, top: 4, width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 4, zIndex: 2 },
  stationComplete: { backgroundColor: palette.emeraldDeep },
  stationCurrent: { left: 4, top: 0, width: 46, height: 46, backgroundColor: palette.forestInk, ...shadow.floating },
  stationLocked: { backgroundColor: '#E5E8E5', borderWidth: 2, borderColor: '#CBD1CC' },
  compactStop: { gap: space.sm, paddingTop: space.xs },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  currentCard: { backgroundColor: '#E6F2FA', borderColor: '#A9D1C0', borderWidth: 1.5, borderRadius: radius.md, padding: space.lg, gap: space.md },
  currentMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  continueChip: { backgroundColor: palette.emeraldDeep, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: space.xs },
  resumeButton: { marginTop: space.sm, backgroundColor: palette.forestInk, minHeight: 52, paddingHorizontal: space.md, flexDirection: 'row', gap: space.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
