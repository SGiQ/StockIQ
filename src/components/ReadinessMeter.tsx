import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { CardSurface, PillButton, Text } from '@/components/primitives';
import type { MarketReadiness } from '@/features/achievements';
import { palette, radius, space } from '@/theme/tokens';

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
  const { score, tier, components } = readiness;

  return (
    <CardSurface style={styles.card}>
      <View style={styles.top}>
        <Ring score={score} color={tier.color} />
        <View style={styles.headline}>
          <Text variant="label" color={palette.slate} uppercase>
            Market Readiness
          </Text>
          <Text variant="h2" color={palette.ink}>
            {tier.label}
          </Text>
          <Text variant="caption" color={palette.slate}>
            {tier.caption}
          </Text>
        </View>
      </View>

      <View style={styles.components}>
        {components.map((component) => (
          <View key={component.key} style={styles.componentRow}>
            <Text variant="caption" color={palette.slate} style={styles.componentLabel}>
              {component.label}
            </Text>
            <View style={styles.componentTrack}>
              <View
                style={[
                  styles.componentFill,
                  { width: `${Math.round(component.value * 100)}%`, backgroundColor: tier.color },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      <PillButton
        label={assessmentTaken ? 'Retake the readiness check' : 'Take the readiness check'}
        variant="dark"
        onPress={onTakeCheck}
      />

      <Text variant="caption" color={palette.slateLight} align="center">
        Measures how much of the StockIQ curriculum you've mastered — not a signal to buy or sell.
        All investing carries risk.
      </Text>
    </CardSurface>
  );
}

function Ring({ score, color }: { score: number; color: string }) {
  const size = 96;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const arc = (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={palette.hairline} strokeWidth={stroke} fill="none" />
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
        <Text variant="h1" color={palette.ink}>
          {score}
        </Text>
        <Text variant="label" color={palette.slateLight}>
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
    backgroundColor: palette.hairline,
    overflow: 'hidden',
  },
  componentFill: { height: '100%', borderRadius: radius.pill },
});
