import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { CardSurface, PillButton, Text } from '@/components/primitives';
import type { MarketReadiness } from '@/features/achievements';
import { useTweenedValue } from '@/lib/useTweenedValue';
import { motion, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/**
 * The Market Readiness card.
 *
 * A ring gauge with the 0..100 score, the tier label, the five components that
 * make it up, and — non-negotiable — the line that says this measures learning,
 * not a licence to trade. The score is meant to motivate more learning, so the
 * breakdown is shown openly: the learner can see exactly which lever (finish
 * lessons, get quizzes right, spread across topics, take the check, keep a
 * streak) moves it next.
 */
export function ReadinessMeter({
  readiness,
  onTakeCheck,
  assessmentTaken,
}: {
  readiness: MarketReadiness;
  onTakeCheck: () => void;
  assessmentTaken: boolean;
}) {
  const colors = useColors();
  const { score, tier, components } = readiness;

  return (
    <CardSurface style={styles.card}>
      <View style={styles.top}>
        <Ring score={score} color={tier.color} />
        <View style={styles.headline}>
          <Text variant="label" color={colors.slate} uppercase>
            Market Readiness
          </Text>
          <Text variant="h2">
            {tier.label}
          </Text>
          <Text variant="caption" color={colors.slate}>
            {tier.caption}
          </Text>
        </View>
      </View>

      <View style={styles.components}>
        {components.map((component) => (
          <View key={component.key} style={styles.componentRow}>
            <Text variant="caption" color={colors.slate} style={styles.componentLabel}>
              {component.label}
            </Text>
            <View style={[styles.componentTrack, { backgroundColor: colors.hairline }]}>
              <ComponentFill value={component.value} color={tier.color} />
            </View>
          </View>
        ))}
      </View>

      <PillButton
        label={assessmentTaken ? 'Retake the readiness check' : 'Take the readiness check'}
        variant="dark"
        onPress={onTakeCheck}
      />

      <Text variant="caption" color={colors.slateLight} align="center">
        Measures how much of the StockiQ curriculum you've mastered — not a signal to buy or sell.
        All investing carries risk.
      </Text>
    </CardSurface>
  );
}

/**
 * A component bar. Full width, scaled on X from the left so a score change
 * springs the fill without touching layout.
 */
function ComponentFill({ value, color }: { value: number; color: string }) {
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(Math.max(0, Math.min(1, value)));

  useEffect(() => {
    const next = Math.max(0, Math.min(1, value));
    fill.value = reduceMotion ? next : withSpring(next, { ...motion.spring, reduceMotion: ReduceMotion.System });
  }, [value, fill, reduceMotion]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  return <Animated.View style={[styles.componentFill, { backgroundColor: color }, style]} />;
}

function Ring({ score, color }: { score: number; color: string }) {
  const colors = useColors();
  const size = 96;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  // Springs to a new score instead of snapping; the arc and the number read
  // off the same tweened value so they never disagree mid-motion.
  const shown = useTweenedValue(Math.max(0, Math.min(100, score)), { precision: 1 });
  const arc = (shown / 100) * circumference;

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={colors.hairline} strokeWidth={stroke} fill="none" />
        {/* Rotate the arc so it begins at 12 o'clock. A `transform` string
            attribute renders as valid SVG on web; the `origin`/`rotation`
            props emit a `transform-origin` DOM attribute React rejects. At a
            zero score there is no arc — drawing one would leave the rounded
            cap as a stray dot. */}
        {arc > 0 ? (
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ) : null}
      </Svg>
      <View style={styles.ringLabel}>
        <Text variant="h1">
          {Math.round(shown)}
        </Text>
        <Text variant="label" color={colors.slateLight}>
          /100
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  ringWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  headline: { flex: 1, gap: space.xxs },
  components: { gap: space.sm },
  componentRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  componentLabel: { width: 110 },
  componentTrack: {
    flex: 1,
    height: 7,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  componentFill: { width: '100%', height: '100%', borderRadius: radius.pill, transformOrigin: 'left' },
});
