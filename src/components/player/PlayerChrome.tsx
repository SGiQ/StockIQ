import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/primitives';
import { SpeakerIcon } from '@/components/primitives/SpeakerIcon';
import { Sparkle } from './AskSheet';
import { motion, palette, radius, shadow, space } from '@/theme/tokens';

/** Thin mint progress bar pinned to the top of the player. */
export function ProgressBar({ current, total }: { current: number; total: number }) {
  const target = useDerivedValue(
    () => Math.max(0.02, Math.min(1, (current + 1) / Math.max(1, total))),
    [current, total],
  );

  const fill = useAnimatedStyle(() => ({
    width: `${withSpring(target.value * 100, motion.spring)}%`,
  }));

  return (
    <View style={styles.track} accessibilityRole="progressbar">
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

export function ExitButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Close lesson"
      style={styles.exit}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path
          d="M6 6l12 12M18 6L6 18"
          stroke={palette.ink}
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
  return (
    <View style={styles.actionRow}>
      <View style={styles.pill}>
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
              color={narrationPlaying ? palette.emerald : palette.ink}
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
              stroke={reported ? palette.flame : palette.ink}
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
              stroke={saved ? palette.danger : palette.ink}
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
          <Text variant="label" color={palette.paper} uppercase>
            Ask
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

/** Card counter shown next to the progress bar, e.g. "3 / 11". */
export function CardCounter({ current, total }: { current: number; total: number }) {
  return (
    <Text variant="label" color={palette.slateLight}>
      {`${current + 1} / ${total}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.hairline,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.mint,
  },
  exit: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.paper,
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
    backgroundColor: palette.paper,
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
