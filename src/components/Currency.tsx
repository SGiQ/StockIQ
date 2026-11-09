import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AnimatedNumber } from '@/components/primitives';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

/** A cut gem — the currency mark, distinct from the red hearts. */
export function GemIcon({ size = 18, color = palette.azure }: { size?: number; color?: string }) {
  const colors = useColors();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6 3h12l3.2 5.2L12 21.5 2.8 8.2z"
        fill={color}
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {/* Facets, drawn faintly over the fill. */}
      <Path
        d="M6 3l2.4 5.2h7.2L18 3M2.8 8.2h18.4M8.4 8.2L12 21.5l3.6-13.3"
        fill="none"
        stroke={colors.paper}
        strokeOpacity={0.5}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const wholeNumber = (n: number) => String(Math.round(n));

/** The gem balance chip: icon + count, for headers and reward rows. Counts to a new balance. */
export function GemCounter({ balance, size = 18 }: { balance: number; size?: number }) {
  return (
    <View style={styles.chip} accessibilityLabel={`${balance} gems`}>
      <GemIcon size={size} />
      <AnimatedNumber value={balance} format={wholeNumber} variant="label" color={palette.azure} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs + 2,
    backgroundColor: palette.azureSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs + 1,
  },
});
