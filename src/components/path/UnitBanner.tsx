import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/primitives';
import { palette, radius, space } from '@/theme/tokens';

/**
 * The lavender section header from the course path — "UNIT 1 / NAME" in a
 * rounded outlined box. Two lines of small caps rather than one long line,
 * so long unit names stay centred instead of truncating.
 */
export function UnitBanner({ index, name }: { index: number; name: string }) {
  return (
    <View style={styles.banner}>
      <Text variant="label" color={palette.violetInk} align="center" uppercase>
        {`Unit ${index}`}
      </Text>
      <Text variant="label" color={palette.violet} align="center" uppercase>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1.5,
    borderColor: palette.violet,
    backgroundColor: palette.violetSoft,
    borderRadius: radius.md,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    gap: space.xxs,
  },
});
