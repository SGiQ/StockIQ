import type { ReactNode } from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import type { GlyphName } from '@/content/types';

/**
 * The glyph set.
 *
 * One flat, stroke-based style on a 24×24 grid, drawn once and reused across
 * hundreds of cards. Heavy reuse of a small consistent set reads as a design
 * system; a large set of one-off illustrations reads as inconsistency, which
 * is exactly the trap an AI-image pipeline falls into.
 *
 * Every glyph inherits `stroke` from its parent group, so a glyph picks up
 * the ink colour of whatever pastel panel it sits on.
 */

const GLYPHS: Record<GlyphName, ReactNode> = {
  'chart-up': (
    <>
      <Path d="M3 20h18" />
      <Path d="M5 16l4-4.5 3.2 3 5.3-7" />
      <Path d="M17.5 7.5H21V11" />
    </>
  ),
  'chart-down': (
    <>
      <Path d="M3 20h18" />
      <Path d="M5 8l4 4.5 3.2-3 5.3 7" />
      <Path d="M17.5 16.5H21V13" />
    </>
  ),
  candle: (
    <>
      <Line x1="8" y1="3" x2="8" y2="21" />
      <Rect x="5.5" y="7" width="5" height="8" rx="1" />
      <Line x1="16" y1="4" x2="16" y2="20" />
      <Rect x="13.5" y="9" width="5" height="7" rx="1" />
    </>
  ),
  coin: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 8v8M14.5 9.5a2.5 2.5 0 100 5" />
    </>
  ),
  'coins-stack': (
    <>
      <Path d="M4 8c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z" />
      <Path d="M4 8v4c0 1.7 3.6 3 8 3s8-1.3 8-3V8" />
      <Path d="M4 12v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4" />
    </>
  ),
  bank: (
    <>
      <Path d="M3 9l9-5 9 5" />
      <Path d="M4 9v9M9 9v9M15 9v9M20 9v9" />
      <Path d="M2.5 20h19" />
    </>
  ),
  briefcase: (
    <>
      <Rect x="3" y="7.5" width="18" height="12" rx="2.5" />
      <Path d="M9 7.5V6a2 2 0 012-2h2a2 2 0 012 2v1.5" />
      <Line x1="3" y1="13" x2="21" y2="13" />
    </>
  ),
  scale: (
    <>
      <Line x1="12" y1="4" x2="12" y2="20" />
      <Line x1="6" y1="20" x2="18" y2="20" />
      <Line x1="4" y1="8" x2="20" y2="8" />
      <Path d="M4 8l-2.5 5h5L4 8zM20 8l-2.5 5h5L20 8z" />
    </>
  ),
  shield: <Path d="M12 3l8 3v6c0 4.6-3.3 8-8 9-4.7-1-8-4.4-8-9V6l8-3z" />,
  clock: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 7.5V12l3.5 2.5" />
    </>
  ),
  calendar: (
    <>
      <Rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <Line x1="3.5" y1="10" x2="20.5" y2="10" />
      <Path d="M8 3v3.5M16 3v3.5" />
      <Circle cx="8.5" cy="14.5" r="1" />
      <Circle cx="12" cy="14.5" r="1" />
    </>
  ),
  target: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Circle cx="12" cy="12" r="5" />
      <Circle cx="12" cy="12" r="1.6" />
    </>
  ),
  flag: (
    <>
      <Line x1="6" y1="3" x2="6" y2="21" />
      <Path d="M6 4h11l-2.5 4L17 12H6z" />
    </>
  ),
  lightbulb: (
    <>
      <Path d="M9 16a6 6 0 116 0c-.8.8-1 1.6-1 2.5h-4c0-.9-.2-1.7-1-2.5z" />
      <Path d="M10 21h4" />
    </>
  ),
  brain: (
    <>
      <Path d="M11 5a3.5 3.5 0 00-3.5 3.5A3 3 0 006 11a3 3 0 001.8 2.8A3 3 0 0011 19V5z" />
      <Path d="M13 5a3.5 3.5 0 013.5 3.5A3 3 0 0118 11a3 3 0 01-1.8 2.8A3 3 0 0113 19V5z" />
    </>
  ),
  eye: (
    <>
      <Path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" />
      <Circle cx="12" cy="12" r="2.8" />
    </>
  ),
  lock: (
    <>
      <Rect x="5" y="11" width="14" height="9.5" rx="2.5" />
      <Path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  key: (
    <>
      <Circle cx="8" cy="8" r="4.5" />
      <Path d="M11.2 11.2L20 20M17 17l2-2M14.5 14.5l2-2" />
    </>
  ),
  magnifier: (
    <>
      <Circle cx="10.5" cy="10.5" r="6.5" />
      <Line x1="15.5" y1="15.5" x2="20.5" y2="20.5" />
    </>
  ),
  exchange: (
    <>
      <Path d="M4 9h14l-3.5-3.5M20 15H6l3.5 3.5" />
    </>
  ),
  percent: (
    <>
      <Circle cx="7.5" cy="7.5" r="3" />
      <Circle cx="16.5" cy="16.5" r="3" />
      <Line x1="19" y1="5" x2="5" y2="19" />
    </>
  ),
  dollar: (
    <>
      <Line x1="12" y1="2.5" x2="12" y2="21.5" />
      <Path d="M16.5 7a4 4 0 00-4-2.5h-1a3.5 3.5 0 000 7h1.5a3.5 3.5 0 010 7h-1A4 4 0 017 16" />
    </>
  ),
  pie: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 12V3.5M12 12l7.5 4" />
    </>
  ),
  bell: (
    <>
      <Path d="M6 16V11a6 6 0 1112 0v5l1.5 2.5h-15L6 16z" />
      <Path d="M10 19a2 2 0 004 0" />
    </>
  ),
  warning: (
    <>
      <Path d="M12 3.5l9.5 16.5h-19L12 3.5z" />
      <Path d="M12 9.5v4.5" />
      <Circle cx="12" cy="17" r="0.9" />
    </>
  ),
  check: <Path d="M4.5 12.5l5 5 10-11" />,
  cross: <Path d="M6 6l12 12M18 6L6 18" />,
  heart: (
    <Path d="M12 20.5C6.5 16.8 3 13.9 3 9.9A4.9 4.9 0 017.9 5c1.7 0 3.2.8 4.1 2.1A5 5 0 0116.1 5 4.9 4.9 0 0121 9.9c0 4-3.5 6.9-9 10.6z" />
  ),
  star: (
    <Path d="M12 3.5l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.9l6.1-.8L12 3.5z" />
  ),
  'arrow-up': <Path d="M12 20V4M5.5 10.5L12 4l6.5 6.5" />,
  'arrow-down': <Path d="M12 4v16M5.5 13.5L12 20l6.5-6.5" />,
  building: (
    <>
      <Path d="M2.5 21h19" />
      <Path d="M5 21V7.5L11 4v17" />
      <Path d="M11 21V11l8 3.5V21" />
      <Path d="M7.5 9.5v1.5M7.5 13v1.5M7.5 16.5V18M14.5 16v1.5M16.5 16.8v1.5" />
    </>
  ),
  people: (
    <>
      <Circle cx="9" cy="8" r="3.2" />
      <Path d="M3.5 20a5.5 5.5 0 0111 0" />
      <Path d="M15.5 5.2a3.2 3.2 0 010 5.6M16.5 20a5.5 5.5 0 00-1.6-3.9" />
    </>
  ),
  handshake: (
    <>
      <Path d="M2.5 12l4-3.5 5.5 4 5.5-4 4 3.5" />
      <Path d="M6.5 8.5V15a2 2 0 002 2h7a2 2 0 002-2V8.5" />
      <Path d="M9.5 12.5l2.5 2 2.5-2" />
    </>
  ),
  newspaper: (
    <>
      <Rect x="3" y="5" width="18" height="14" rx="2" />
      <Path d="M6.5 9h5M6.5 12.5h5M6.5 16h5M14.5 9h3M14.5 12.5h3" />
    </>
  ),
  ladder: (
    <>
      <Line x1="8" y1="3" x2="8" y2="21" />
      <Line x1="16" y1="3" x2="16" y2="21" />
      <Path d="M8 7h8M8 11h8M8 15h8M8 19h8" />
    </>
  ),
  anchor: (
    <>
      <Circle cx="12" cy="5.5" r="2.5" />
      <Line x1="12" y1="8" x2="12" y2="21" />
      <Path d="M7 11h10" />
      <Path d="M4 15a8 8 0 0016 0" />
    </>
  ),
  compass: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M15 9l-2 4-4 2 2-4 4-2z" />
    </>
  ),
  seed: (
    <>
      <Path d="M12 21v-8" />
      <Path d="M12 13c0-3 2-5 5-5 0 3-2 5-5 5z" />
      <Path d="M12 15c0-2.6-1.8-4.5-4.5-4.5 0 2.6 1.8 4.5 4.5 4.5z" />
    </>
  ),
  tree: (
    <>
      <Path d="M12 21v-5" />
      <Path d="M12 16a5.5 5.5 0 01-2-10.6A4 4 0 0112 3a4 4 0 012 2.4A5.5 5.5 0 0112 16z" />
    </>
  ),
};

export interface GlyphProps {
  name: GlyphName;
  size?: number;
  color: string;
  strokeWidth?: number;
}

export function Glyph({ name, size = 40, color, strokeWidth = 1.9 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {GLYPHS[name]}
      </G>
    </Svg>
  );
}
