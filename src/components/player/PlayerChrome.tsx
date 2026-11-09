import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, SpringFill } from '@/components/primitives';
import { SpeakerIcon } from '@/components/primitives/SpeakerIcon';
import { Sparkle } from './AskSheet';
import { palette, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/** Thin mint progress bar pinned to the top of the player. */
export function ProgressBar({ current, total }: { current: number; total: number }) {
  const colors = useColors();
  // The width is still a plain percentage from the card index — a reanimated
  // width once froze in the production web build and never advanced. The
  // spring in SpringFill is a transform on top that converges to identity,
  // so if it ever fails to drive the bar is simply static and still correct.
  const pct = Math.max(2, Math.min(100, ((current + 1) / Math.max(1, total)) * 100));

  return (
    <View
      style={[styles.track, { backgroundColor: colors.hairline }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: current + 1 }}
    >
      <SpringFill pct={pct} color={palette.mint} />
    </View>
  );
}

export function ExitButton({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Close lesson"
      style={[styles.exit, { borderColor: colors.hairline, backgroundColor: colors.paper }]}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path
          d="M6 6l12 12M18 6L6 18"
          stroke={colors.ink}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      </Svg>
    </Pressable>
  );
}

/**
 * The floating action pill: narration, report, save, and gradient ASK.
 *
 * ASK sits outside the pill as its own circle, matching the reference — it is
 * a different kind of action from the two card-level toggles beside it.
 */
export function ActionPill({
  saved,
  reported,
  onToggleSave,
  onReport,
  onAsk,
  narrationAvailable = false,
  narrationEnabled = false,
  narrationPlaying = false,
  onToggleNarration,
}: {
  saved: boolean;
  reported: boolean;
  onToggleSave: () => void;
  onReport: () => void;
  onAsk: () => void;
  narrationAvailable?: boolean;
  narrationEnabled?: boolean;
  narrationPlaying?: boolean;
  onToggleNarration?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.actionRow}>
      <View style={[styles.pill, { backgroundColor: colors.paper }]}>
        {narrationAvailable && onToggleNarration ? (
          <Pressable
            onPress={onToggleNarration}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              narrationPlaying
                ? 'Turn off card narration'
                : narrationEnabled
                  ? 'Play card narration'
                  : 'Turn on card narration'
            }
            accessibilityState={{ selected: narrationEnabled }}
            style={styles.pillButton}
          >
            <SpeakerIcon
              color={narrationPlaying ? palette.emerald : colors.ink}
              muted={!narrationEnabled}
            />
          </Pressable>
        ) : null}

        <Pressable
          onPress={onReport}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={reported ? 'Card reported' : 'Report a problem with this card'}
          accessibilityState={{ selected: reported }}
          style={styles.pillButton}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path
              d="M6 21V4M6 4.5h11l-2.5 4L17 13H6z"
              stroke={reported ? palette.flame : colors.ink}
              fill={reported ? palette.flame : 'none'}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        <Pressable
          onPress={onToggleSave}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved cards' : 'Save this card'}
          accessibilityState={{ selected: saved }}
          style={styles.pillButton}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path
              d="M12 20.5C6.5 16.8 3 13.9 3 9.9A4.9 4.9 0 017.9 5c1.7 0 3.2.8 4.1 2.1A5 5 0 0116.1 5 4.9 4.9 0 0121 9.9c0 4-3.5 6.9-9 10.6z"
              stroke={saved ? palette.danger : colors.ink}
              fill={saved ? palette.danger : 'none'}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>

      <Pressable
        onPress={onAsk}
        accessibilityRole="button"
        accessibilityLabel="Ask about this card"
        style={({ pressed }) => [styles.ask, pressed && styles.askPressed]}
      >
        <LinearGradient
          colors={[palette.askFrom, palette.askTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.askGradient}
        >
          <Sparkle size={18} />
          <Text variant="label" color={colors.paper} uppercase>
            Ask
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

/** Card counter shown next to the progress bar, e.g. "3 / 11". */
export function CardCounter({ current, total }: { current: number; total: number }) {
  const colors = useColors();
  return (
    <Text variant="label" color={colors.slateLight}>
      {`${current + 1} / ${total}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  exit: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    ...shadow.card,
  },
  ask: {
    borderRadius: radius.pill,
    overflow: 'hidden',
    ...shadow.card,
  },
  askPressed: {
    opacity: 0.85,
  },
  askGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm + 6,
  },
  pillButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
