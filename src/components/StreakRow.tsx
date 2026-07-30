import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/primitives';
import { trailingWeek, type DayISO } from '@/lib/dates';
import { palette, radius, space } from '@/theme/tokens';

/** The flame from the Imprint streak row — filled when the day is active. */
function Flame({ active }: { active: boolean }) {
  return (
    <Svg width={20} height={22} viewBox="0 0 24 24">
      <Path
        d="M12 2.5c.6 3 2.4 4.2 3.9 5.7A7.6 7.6 0 0118.5 14a6.5 6.5 0 01-13 0c0-2.3 1.1-3.9 2.3-5.3.5 1 1.2 1.6 2 1.9-.4-2.9.5-6 2.2-8.1z"
        fill={active ? palette.flame : palette.hairline}
        stroke={active ? palette.flame : palette.hairline}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {active && (
        <Path
          d="M12 21a3.2 3.2 0 01-1.6-6c.2 1 .8 1.6 1.6 2 .5-.9.6-1.9.3-2.9 1.6 1 2.5 2.3 2.5 3.7A3.2 3.2 0 0112 21z"
          fill={palette.flameSoft}
        />
      )}
    </Svg>
  );
}

export interface StreakRowProps {
  activeDays: DayISO[];
  /** Today is drawn in a stadium outline, matching the screenshots. */
  today?: DayISO;
}

/**
 * The trailing week of activity.
 *
 * Shared by the home screen and the lesson-completion screen so the streak
 * looks like one object the learner is maintaining rather than two separate
 * widgets that happen to agree.
 */
export function StreakRow({ activeDays, today }: StreakRowProps) {
  const week = trailingWeek(activeDays, today);

  return (
    <View style={styles.row}>
      {week.map((day) => (
        <View key={day.day} style={styles.day}>
          <Text variant="label" color={day.isToday ? palette.forestDeep : palette.slateLight}>
            {day.initial}
          </Text>
          <View style={[styles.slot, day.isToday && styles.slotToday]}>
            <Flame active={day.active} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    gap: space.xs,
    flex: 1,
  },
  slot: {
    width: 34,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  slotToday: {
    borderColor: palette.forestDeep,
  },
});
