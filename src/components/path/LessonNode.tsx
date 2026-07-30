import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/primitives';
import type { LessonNodeStatus } from '@/store/slices/useAppStore';
import { palette, radius, shadow, space } from '@/theme/tokens';

export interface LessonNodeProps {
  title: string;
  status: LessonNodeStatus;
  /** A clean run (every interactive card right first try) earns the star. */
  starred?: boolean;
  onPress: () => void;
}

const SIZE = 64;

/**
 * A single stop on the unit path.
 *
 * Four states, distinguished by fill rather than by a badge, so the path
 * reads at a glance: green check for done, violet star for a clean run,
 * white ring for available, flat grey for locked.
 */
export function LessonNode({ title, status, starred, onPress }: LessonNodeProps) {
  const locked = status === 'locked';
  const completed = status === 'completed';

  const fill = completed
    ? starred
      ? palette.violet
      : palette.emerald
    : locked
      ? palette.hairline
      : palette.paper;

  const border = completed ? 'transparent' : locked ? palette.hairline : palette.emerald;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        disabled={locked}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: locked }}
        style={({ pressed }) => [
          styles.node,
          {
            backgroundColor: fill,
            borderColor: border,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
          !locked && shadow.card,
        ]}
      >
        {completed ? (
          <Svg width={28} height={28} viewBox="0 0 24 24">
            {starred ? (
              <Path
                d="M12 3.5l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.9l6.1-.8L12 3.5z"
                fill={palette.paper}
              />
            ) : (
              <Path
                d="M4.5 12.5l5 5 10-11"
                stroke={palette.paper}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
          </Svg>
        ) : locked ? (
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path
              d="M5 11h14v9.5H5zM8 11V8a4 4 0 018 0v3"
              stroke={palette.slateLight}
              strokeWidth={2}
              fill="none"
              strokeLinejoin="round"
            />
          </Svg>
        ) : (
          <View
            style={[
              styles.dot,
              status === 'in_progress' && { backgroundColor: palette.mint },
            ]}
          />
        )}
      </Pressable>

      <Text
        variant="caption"
        color={locked ? palette.slateLight : palette.inkSoft}
        align="center"
        numberOfLines={2}
        style={styles.label}
      >
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 108,
    alignItems: 'center',
    gap: space.sm,
  },
  node: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: palette.emerald,
  },
  label: {
    paddingHorizontal: space.xxs,
  },
});
