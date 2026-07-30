import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export type TabIconName = 'home' | 'globe' | 'bookmark' | 'heart';

/**
 * The four bottom-tab glyphs, matching the icon set in the Imprint
 * screenshots. Kept separate from the content Glyph set: these are chrome,
 * they render at one size, and they need a filled state.
 */
export function TabIcon({
  name,
  color,
  filled,
  size = 26,
}: {
  name: TabIconName;
  /** Comes straight from the navigator's tint, which is a ColorValue. */
  color: ColorValue;
  filled: boolean;
  size?: number;
}) {
  const stroke = { stroke: color, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const fill = filled ? color : 'none';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && (
        <Path d="M3.5 10.5L12 3.5l8.5 7v9a1 1 0 01-1 1h-15a1 1 0 01-1-1v-9z" fill={fill} {...stroke} />
      )}

      {name === 'globe' && (
        <>
          <Circle cx="12" cy="12" r="8.75" fill={fill} {...stroke} />
          <Path
            d="M3.4 12h17.2M12 3.3c2.2 2.4 3.3 5.4 3.3 8.7s-1.1 6.3-3.3 8.7c-2.2-2.4-3.3-5.4-3.3-8.7S9.8 5.7 12 3.3z"
            fill="none"
            stroke={filled ? '#FFFFFF' : color}
            strokeWidth={1.7}
          />
        </>
      )}

      {name === 'bookmark' && (
        <Path d="M6 3.75h12a1 1 0 011 1V21l-7-4.2L5 21V4.75a1 1 0 011-1z" fill={fill} {...stroke} />
      )}

      {name === 'heart' && (
        <Path
          d="M12 20.5C6.5 16.8 3 13.9 3 9.9A4.9 4.9 0 017.9 5c1.7 0 3.2.8 4.1 2.1A5 5 0 0116.1 5 4.9 4.9 0 0121 9.9c0 4-3.5 6.9-9 10.6z"
          fill={fill}
          {...stroke}
        />
      )}
    </Svg>
  );
}
