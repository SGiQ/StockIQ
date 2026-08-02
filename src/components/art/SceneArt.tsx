import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { PalettePreset, SceneName } from '@/content/types';
import { artPalettes } from '@/theme/tokens';

interface SceneArtProps {
  name: SceneName;
  palette: PalettePreset;
  alt: string;
  active: boolean;
}

type SceneTheme = { bg: string; ink: string; accent: string };

const Label = ({ x, y, children, theme, anchor = 'middle' }: {
  x: number; y: number; children: ReactNode; theme: SceneTheme; anchor?: 'start' | 'middle' | 'end';
}) => (
  <SvgText
    x={x}
    y={y}
    fill={theme.ink}
    fontFamily="Inter_700Bold"
    fontSize="9"
    letterSpacing="0.5"
    textAnchor={anchor}
  >
    {children}
  </SvgText>
);

const MutedLabel = ({ x, y, children, theme, anchor = 'middle' }: {
  x: number; y: number; children: ReactNode; theme: SceneTheme; anchor?: 'start' | 'middle' | 'end';
}) => (
  <SvgText
    x={x}
    y={y}
    fill={theme.ink}
    fillOpacity={0.62}
    fontFamily="Inter_600SemiBold"
    fontSize="7"
    letterSpacing="0.35"
    textAnchor={anchor}
  >
    {children}
  </SvgText>
);

const Arrow = ({ x1, y1, x2, y2, theme, dashed = false }: {
  x1: number; y1: number; x2: number; y2: number; theme: SceneTheme; dashed?: boolean;
}) => (
  <G stroke={theme.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Line x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray={dashed ? '4 4' : undefined} />
    <Path d={`M${x2 - 6} ${y2 - 4}L${x2} ${y2}l-6 4`} fill="none" />
  </G>
);

const Person = ({ x, y, theme }: { x: number; y: number; theme: SceneTheme }) => (
  <G fill="none" stroke={theme.ink} strokeWidth="2">
    <Circle cx={x} cy={y} r="6" />
    <Path d={`M${x - 11} ${y + 20}c1-8 5-12 11-12s10 4 11 12`} />
  </G>
);

function OwnershipScene({ name, theme }: { name: SceneName; theme: SceneTheme }) {
  if (name === 'equity-vs-debt') {
    return (
      <>
        <Label x={56} y={28} theme={theme}>OWNER</Label>
        <Label x={184} y={28} theme={theme}>LENDER</Label>
        <Person x={56} y={58} theme={theme} />
        <G transform="translate(166 44)" fill="none" stroke={theme.ink} strokeWidth="2">
          <Rect width="36" height="29" rx="5" />
          <Path d="M7 9h22M7 16h18M7 23h12" />
        </G>
        <Path d="M98 41v60" stroke={theme.ink} strokeOpacity={0.22} strokeWidth="2" />
        <Label x={56} y={108} theme={theme}>UPSIDE + RISK</Label>
        <Label x={184} y={108} theme={theme}>INTEREST + CLAIM</Label>
      </>
    );
  }
  if (name === 'owner-outcomes') {
    return (
      <>
        <G transform="translate(21 20)">
          <Rect width="62" height="88" rx="14" fill={theme.accent} fillOpacity={0.18} />
          <Path d="M17 66l12-13 10 7 11-23" fill="none" stroke={theme.ink} strokeWidth="3" />
          <Label x={31} y={22} theme={theme}>GROWTH</Label>
        </G>
        <G transform="translate(89 20)">
          <Rect width="62" height="88" rx="14" fill={theme.accent} fillOpacity={0.36} />
          <Circle cx="31" cy="56" r="16" fill="none" stroke={theme.ink} strokeWidth="3" />
          <Path d="M31 45v22M36 49c-2-3-12-3-12 2 0 6 13 3 13 9 0 5-10 5-13 1" fill="none" stroke={theme.ink} strokeWidth="2" />
          <Label x={31} y={22} theme={theme}>CASH</Label>
        </G>
        <G transform="translate(157 20)">
          <Rect width="62" height="88" rx="14" fill={theme.ink} fillOpacity={0.08} />
          <Path d="M18 41l26 29M44 41L18 70" stroke={theme.ink} strokeWidth="3" />
          <Label x={31} y={22} theme={theme}>LOSS</Label>
        </G>
      </>
    );
  }
  const ledger = name === 'share-ledger';
  return (
    <>
      <G transform="translate(19 19)">
        <Rect width="96" height="91" rx="14" fill={theme.ink} fillOpacity={0.08} />
        <Path d="M22 70V33l26-13 26 13v37M14 70h68M35 42v14M48 42v14M61 42v14" fill="none" stroke={theme.ink} strokeWidth="2.5" />
        <Label x={48} y={85} theme={theme}>COMPANY</Label>
      </G>
      <Arrow x1={122} y1={64} x2={150} y2={64} theme={theme} />
      <G transform="translate(158 24)">
        {ledger ? (
          <>
            <Rect width="62" height="81" rx="11" fill={theme.accent} fillOpacity={0.2} stroke={theme.ink} strokeWidth="2" />
            <Path d="M13 21h36M13 34h25M13 47h32M13 60h20" stroke={theme.ink} strokeWidth="2" />
            <Label x={31} y={75} theme={theme}>LEDGER</Label>
          </>
        ) : (
          <>
            {[0, 1, 2, 3].map((i) => <Rect key={i} x={(i % 2) * 31} y={Math.floor(i / 2) * 35} width="27" height="31" rx="7" fill={i === 0 ? theme.accent : theme.ink} fillOpacity={i === 0 ? 0.72 : 0.12} />)}
            <Label x={29} y={80} theme={theme}>YOUR SLICE</Label>
          </>
        )}
      </G>
    </>
  );
}

function CapitalScene({ name, theme }: { name: SceneName; theme: SceneTheme }) {
  const labels: Record<string, [string, string, string]> = {
    'capital-journey': ['INVESTORS', 'CAPITAL', 'GROWTH'],
    'ipo-launch': ['PRIVATE', 'IPO', 'PUBLIC'],
    'primary-secondary': ['INVESTOR', 'COMPANY', 'MARKET'],
    'liquidity-exit': ['EARLY OWNER', 'MARKET', 'CASH'],
  };
  const [a, b, c] = labels[name] ?? labels['capital-journey'];
  return (
    <>
      <G transform="translate(13 37)">
        <Rect width="62" height="56" rx="15" fill={theme.ink} fillOpacity={0.08} />
        <Person x={31} y={18} theme={theme} />
        <Label x={31} y={49} theme={theme}>{a}</Label>
      </G>
      <Arrow x1={79} y1={64} x2={104} y2={64} theme={theme} />
      <G transform="translate(109 22)">
        <Circle cx="22" cy="42" r="27" fill={theme.accent} fillOpacity={0.4} stroke={theme.ink} strokeWidth="2.5" />
        <Path d="M22 27v30M29 34c-4-6-17-5-17 2 0 9 20 4 20 13 0 8-15 9-20 2" fill="none" stroke={theme.ink} strokeWidth="2" />
        <Label x={22} y={82} theme={theme}>{b}</Label>
      </G>
      <Arrow x1={160} y1={64} x2={181} y2={64} theme={theme} />
      <G transform="translate(184 27)">
        <Rect width="43" height="65" rx="10" fill={theme.ink} fillOpacity={0.1} />
        <Path d="M8 50V24l14-10 14 10v26M4 50h35M16 29v11M27 29v11" fill="none" stroke={theme.ink} strokeWidth="2" />
        <Label x={21} y={79} theme={theme}>{c}</Label>
      </G>
    </>
  );
}

function ValuationScene({ name, theme }: { name: SceneName; theme: SceneTheme }) {
  if (name === 'size-spectrum') {
    return (
      <>
        {[{ x: 18, s: 34, l: 'SMALL' }, { x: 81, s: 55, l: 'MID' }, { x: 167, s: 75, l: 'LARGE' }].map(({ x, s, l }, i) => (
          <G key={l} transform={`translate(${x} ${105 - s})`}>
            <Rect width={s} height={s} rx={10} fill={i === 2 ? theme.accent : theme.ink} fillOpacity={i === 2 ? 0.55 : 0.1 + i * 0.08} />
            <Label x={s / 2} y={s + 16} theme={theme}>{l}</Label>
          </G>
        ))}
      </>
    );
  }
  if (name === 'price-vs-value') {
    return (
      <>
        <G transform="translate(24 22)">
          <Rect width="78" height="82" rx="16" fill={theme.ink} fillOpacity={0.08} />
          <SvgText x="39" y="51" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="27" textAnchor="middle">$500</SvgText>
          <Label x={39} y={70} theme={theme}>PRICE</Label>
        </G>
        <SvgText x="120" y="74" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="22" textAnchor="middle">≠</SvgText>
        <G transform="translate(138 22)">
          <Rect width="78" height="82" rx="16" fill={theme.accent} fillOpacity={0.38} />
          <Path d="M17 59l17-18 12 9 15-25" fill="none" stroke={theme.ink} strokeWidth="3" />
          <Label x={39} y={70} theme={theme}>VALUE</Label>
        </G>
      </>
    );
  }
  return (
    <>
      <G transform="translate(17 25)">
        <Rect width="58" height="68" rx="14" fill={theme.ink} fillOpacity={0.09} />
        <SvgText x="29" y="39" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="18" textAnchor="middle">$20</SvgText>
        <Label x={29} y={58} theme={theme}>PRICE</Label>
      </G>
      <SvgText x="91" y="66" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="18" textAnchor="middle">×</SvgText>
      <G transform="translate(106 25)">
        <Rect width="58" height="68" rx="14" fill={theme.ink} fillOpacity={0.09} />
        <SvgText x="29" y="39" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="18" textAnchor="middle">50M</SvgText>
        <Label x={29} y={58} theme={theme}>SHARES</Label>
      </G>
      <SvgText x="180" y="66" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="18" textAnchor="middle">=</SvgText>
      <G transform="translate(193 25)">
        <Rect width="39" height="68" rx="14" fill={theme.accent} fillOpacity={0.55} />
        <SvgText x="19.5" y="39" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="14" textAnchor="middle">$1B</SvgText>
        <Label x={19.5} y={58} theme={theme}>CAP</Label>
      </G>
    </>
  );
}

function MarketStructureScene({ name, theme }: { name: SceneName; theme: SceneTheme }) {
  if (name === 'stop-trigger') {
    return (
      <>
        <Path d="M18 30l38 9 35 13 30 8 31 24 33 7 37 17" fill="none" stroke={theme.ink} strokeWidth="3" />
        <Path d="M17 68h206" stroke={theme.accent} strokeWidth="3" strokeDasharray="7 5" />
        <Circle cx="131" cy="68" r="10" fill={theme.accent} stroke={theme.ink} strokeWidth="2" />
        <Path d="M131 45v15M126 52l5 8 5-8" fill="none" stroke={theme.ink} strokeWidth="2" />
        <Label x={59} y={63} theme={theme}>STOP $50</Label>
        <Label x={176} y={103} theme={theme}>MARKET ORDER</Label>
      </>
    );
  }
  if (name === 'order-book') {
    return (
      <>
        <Label x={56} y={21} theme={theme}>BIDS</Label><Label x={184} y={21} theme={theme}>ASKS</Label>
        {[0, 1, 2, 3].map((i) => (
          <G key={i}>
            <Rect x={18 + i * 6} y={31 + i * 20} width={70 - i * 8} height="13" rx="4" fill={theme.accent} fillOpacity={0.65 - i * 0.1} />
            <Rect x={152} y={31 + i * 20} width={45 + i * 8} height="13" rx="4" fill={theme.ink} fillOpacity={0.12 + i * 0.05} />
          </G>
        ))}
        <Line x1="120" y1="27" x2="120" y2="112" stroke={theme.ink} strokeOpacity={0.25} strokeWidth="2" />
      </>
    );
  }
  if (name === 'execution-tradeoff') {
    return (
      <>
        <Label x={44} y={24} theme={theme}>SPEED</Label><Label x={196} y={24} theme={theme}>CONTROL</Label>
        <Path d="M42 62h156" stroke={theme.ink} strokeWidth="4" strokeLinecap="round" />
        <Path d="M120 62l-35 36h70z" fill={theme.ink} fillOpacity={0.15} stroke={theme.ink} strokeWidth="2" />
        <Circle cx="60" cy="56" r="18" fill={theme.accent} fillOpacity={0.65} stroke={theme.ink} strokeWidth="2" />
        <Rect x="163" y="38" width="36" height="36" rx="8" fill={theme.ink} fillOpacity={0.09} stroke={theme.ink} strokeWidth="2" />
        <MutedLabel x={60} y={60} theme={theme}>MARKET</MutedLabel><MutedLabel x={181} y={60} theme={theme}>LIMIT</MutedLabel>
      </>
    );
  }
  const labels: Record<string, [string, string, string]> = {
    'order-route': ['YOU', 'BROKER', 'VENUE'],
    'matching-engine': ['BUYERS', 'MATCH', 'SELLERS'],
    'broker-agent': ['YOU', 'BROKER', 'MARKET'],
  };
  const [a, b, c] = labels[name] ?? labels['order-route'];
  return (
    <>
      <G transform="translate(13 37)"><Rect width="54" height="50" rx="14" fill={theme.ink} fillOpacity={0.08} /><Person x={27} y={14} theme={theme} /><Label x={27} y={43} theme={theme}>{a}</Label></G>
      <Arrow x1={72} y1={62} x2={96} y2={62} theme={theme} />
      <G transform="translate(100 29)"><Rect width="51" height="66" rx="15" fill={theme.accent} fillOpacity={0.45} stroke={theme.ink} strokeWidth="2" /><Path d="M12 23h27M12 33h27M18 15l-6 8 6 8M33 25l6 8-6 8" fill="none" stroke={theme.ink} strokeWidth="2" /><Label x={25.5} y={57} theme={theme}>{b}</Label></G>
      <Arrow x1={157} y1={62} x2={181} y2={62} theme={theme} />
      <G transform="translate(185 37)"><Rect width="42" height="50" rx="12" fill={theme.ink} fillOpacity={0.1} /><Path d="M8 37V17l13-9 13 9v20M4 37h34" fill="none" stroke={theme.ink} strokeWidth="2" /><Label x={21} y={46} theme={theme}>{c}</Label></G>
    </>
  );
}

function TradingScene({ name, theme }: { name: SceneName; theme: SceneTheme }) {
  if (name === 'liquidity-depth') {
    return (
      <>
        <Label x={54} y={23} theme={theme}>DEEP</Label><Label x={186} y={23} theme={theme}>THIN</Label>
        {[0, 1, 2, 3].map((i) => <Rect key={`a${i}`} x={20} y={35 + i * 18} width={75 - i * 8} height="11" rx="4" fill={theme.accent} fillOpacity={0.72 - i * .1} />)}
        {[0, 1, 2, 3].map((i) => <Rect key={`b${i}`} x={156} y={35 + i * 18} width={33 - i * 3} height="11" rx="4" fill={theme.ink} fillOpacity={0.16 + i * .04} />)}
        <Path d="M120 30v78" stroke={theme.ink} strokeOpacity={0.2} strokeWidth="2" />
      </>
    );
  }
  const toll = name === 'spread-toll';
  return (
    <>
      <G transform="translate(17 25)">
        <Rect width="82" height="76" rx="16" fill={theme.accent} fillOpacity={0.38} />
        <MutedLabel x={41} y={21} theme={theme}>BID</MutedLabel>
        <SvgText x="41" y="51" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="22" textAnchor="middle">$99</SvgText>
        <Label x={41} y={67} theme={theme}>SELL</Label>
      </G>
      <G transform="translate(141 25)">
        <Rect width="82" height="76" rx="16" fill={theme.ink} fillOpacity={0.1} />
        <MutedLabel x={41} y={21} theme={theme}>ASK</MutedLabel>
        <SvgText x="41" y="51" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="22" textAnchor="middle">$101</SvgText>
        <Label x={41} y={67} theme={theme}>BUY</Label>
      </G>
      <G transform="translate(103 35)">
        <Rect width="34" height="55" rx="12" fill={toll ? theme.ink : theme.accent} fillOpacity={toll ? 0.9 : 0.62} />
        <SvgText x="17" y="26" fill={toll ? theme.bg : theme.ink} fontFamily="Inter_700Bold" fontSize="11" textAnchor="middle">$2</SvgText>
        <SvgText x="17" y="40" fill={toll ? theme.bg : theme.ink} fontFamily="Inter_600SemiBold" fontSize="6" textAnchor="middle">SPREAD</SvgText>
      </G>
    </>
  );
}

function QuoteScene({ name, theme }: { name: SceneName; theme: SceneTheme }) {
  if (name === 'event-gap') {
    return (
      <>
        <Path d="M18 88L48 78 76 82 102 66" fill="none" stroke={theme.ink} strokeWidth="3" />
        <Path d="M138 42l25 7 28-18 31 5" fill="none" stroke={theme.ink} strokeWidth="3" />
        <Path d="M104 64L136 43" stroke={theme.accent} strokeWidth="4" strokeDasharray="5 5" />
        <Circle cx="120" cy="54" r="24" fill={theme.accent} fillOpacity={0.25} />
        <Label x={120} y={58} theme={theme}>NEWS GAP</Label>
      </>
    );
  }
  if (name === 'price-change') {
    return (
      <>
        <G transform="translate(18 27)"><Rect width="61" height="68" rx="14" fill={theme.ink} fillOpacity={0.08} /><MutedLabel x={30} y={20} theme={theme}>PREV CLOSE</MutedLabel><SvgText x="30" y="49" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="18" textAnchor="middle">$96</SvgText></G>
        <Arrow x1={86} y1={61} x2={113} y2={61} theme={theme} />
        <G transform="translate(119 27)"><Rect width="102" height="68" rx="14" fill={theme.accent} fillOpacity={0.38} /><MutedLabel x={51} y={20} theme={theme}>LAST</MutedLabel><SvgText x="51" y="49" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="18" textAnchor="middle">$100  +4.2%</SvgText></G>
      </>
    );
  }
  const signal = name === 'quote-signal';
  return (
    <>
      <G transform="translate(15 17)">
        <Rect width="210" height="96" rx="15" fill={theme.ink} fillOpacity={0.07} stroke={theme.ink} strokeWidth="2" />
        <Circle cx="18" cy="16" r="3" fill={theme.accent} /><Circle cx="30" cy="16" r="3" fill={theme.ink} fillOpacity={0.2} />
        <SvgText x="16" y="48" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="23">NWR  $104.20</SvgText>
        <Path d="M16 74l25-12 22 6 27-24 25 10 30-18 25 9 24-10" fill="none" stroke={theme.accent} strokeWidth="3" />
        <Rect x={157} y={62} width="35" height="19" rx="6" fill={theme.accent} fillOpacity={0.45} />
        <MutedLabel x={174} y={75} theme={theme}>{signal ? 'SIGNAL' : 'VOLUME'}</MutedLabel>
      </G>
    </>
  );
}

function PriceScene({ name, theme }: { name: SceneName; theme: SceneTheme }) {
  if (name === 'expectations-gap') {
    return (
      <>
        <Label x={60} y={24} theme={theme}>RESULT</Label><Label x={180} y={24} theme={theme}>EXPECTED</Label>
        <Rect x="28" y="48" width="64" height="55" rx="12" fill={theme.accent} fillOpacity={0.55} />
        <Rect x="148" y="37" width="64" height="66" rx="12" fill={theme.ink} fillOpacity={0.11} stroke={theme.ink} strokeDasharray="5 4" strokeWidth="2" />
        <Path d="M99 70h42" stroke={theme.ink} strokeWidth="3" /><Path d="M132 63l9 7-9 7" fill="none" stroke={theme.ink} strokeWidth="3" />
        <Label x={120} y={92} theme={theme}>SURPRISE</Label>
      </>
    );
  }
  if (name === 'supply-demand') {
    return (
      <>
        <Path d="M26 99L205 31" stroke={theme.accent} strokeWidth="4" />
        <Path d="M26 31l179 68" stroke={theme.ink} strokeWidth="4" />
        <Circle cx="116" cy="65" r="10" fill={theme.bg} stroke={theme.ink} strokeWidth="3" />
        <Label x={59} y={24} theme={theme}>SUPPLY</Label><Label x={180} y={24} theme={theme}>DEMAND</Label>
        <MutedLabel x={116} y={86} theme={theme}>PRICE</MutedLabel>
      </>
    );
  }
  return (
    <>
      <G transform="translate(18 27)"><Rect width="72" height="68" rx="16" fill={theme.accent} fillOpacity={0.35} /><Label x={36} y={20} theme={theme}>BUYER</Label><SvgText x="36" y="50" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="18" textAnchor="middle">$100</SvgText></G>
      <G transform="translate(150 27)"><Rect width="72" height="68" rx="16" fill={theme.ink} fillOpacity={0.09} /><Label x={36} y={20} theme={theme}>SELLER</Label><SvgText x="36" y="50" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="18" textAnchor="middle">$100</SvgText></G>
      <Path d="M96 61h48" stroke={theme.ink} strokeWidth="3" /><Circle cx="120" cy="61" r="17" fill={theme.accent} stroke={theme.ink} strokeWidth="2" /><Path d="M112 61l6 6 11-13" fill="none" stroke={theme.ink} strokeWidth="2.5" />
      <Label x={120} y={104} theme={theme}>LAST TRADE</Label>
    </>
  );
}

function IndexScene({ name, theme }: { name: SceneName; theme: SceneTheme }) {
  if (name === 'weighting-tower') {
    return (
      <>
        {[{ y: 21, w: 170, l: 'MEGA CAP' }, { y: 53, w: 118, l: 'LARGE' }, { y: 85, w: 70, l: 'REST' }].map(({ y, w, l }, i) => (
          <G key={l}><Rect x={(240 - w) / 2} y={y} width={w} height="25" rx="7" fill={i === 0 ? theme.accent : theme.ink} fillOpacity={i === 0 ? .58 : .08 + i * .06} /><Label x={120} y={y + 17} theme={theme}>{l}</Label></G>
        ))}
      </>
    );
  }
  if (name === 'price-weighted') {
    return (
      <>
        <G transform="translate(25 24)"><Rect width="68" height="75" rx="15" fill={theme.accent} fillOpacity="0.5" /><SvgText x="34" y="43" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="22" textAnchor="middle">$300</SvgText><Label x={34} y={63} theme={theme}>HEAVY</Label></G>
        <Path d="M101 61h38" stroke={theme.ink} strokeWidth="4" />
        <G transform="translate(147 38)"><Rect width="68" height="47" rx="15" fill={theme.ink} fillOpacity="0.1" /><SvgText x="34" y="29" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="20" textAnchor="middle">$30</SvgText><Label x={34} y={42} theme={theme}>LIGHT</Label></G>
      </>
    );
  }
  if (name === 'benchmark-race') {
    return (
      <>
        <Path d="M20 100C62 83 72 50 112 57s60-17 108-30" fill="none" stroke={theme.accent} strokeWidth="4" />
        <Path d="M20 100c40-9 73-20 109-18s60-19 91-26" fill="none" stroke={theme.ink} strokeOpacity="0.38" strokeWidth="4" strokeDasharray="7 5" />
        <Circle cx="220" cy="27" r="6" fill={theme.accent} /><Circle cx="220" cy="56" r="6" fill={theme.ink} fillOpacity="0.45" />
        <Label x={185} y={18} theme={theme}>YOU</Label><Label x={178} y={70} theme={theme}>BENCHMARK</Label>
      </>
    );
  }
  return (
    <>
      <G transform="translate(19 20)">
        {[0, 1, 2, 3, 4, 5].map((i) => <Rect key={i} x={(i % 3) * 41} y={Math.floor(i / 3) * 41} width="34" height="34" rx="8" fill={i === 0 ? theme.accent : theme.ink} fillOpacity={i === 0 ? .65 : .08 + i * .025} />)}
      </G>
      <Arrow x1={146} y1={62} x2={173} y2={62} theme={theme} />
      <G transform="translate(181 24)"><Rect width="43" height="76" rx="13" fill={theme.accent} fillOpacity="0.35" stroke={theme.ink} strokeWidth="2" /><Path d="M10 57l8-17 7 7 9-23" fill="none" stroke={theme.ink} strokeWidth="3" /><Label x={21.5} y={69} theme={theme}>INDEX</Label></G>
    </>
  );
}

const MoneyStack = ({ x, y, count, theme, faded = false }: { x: number; y: number; count: number; theme: SceneTheme; faded?: boolean }) => (
  <G transform={`translate(${x} ${y})`} opacity={faded ? 0.42 : 1}>
    {Array.from({ length: count }, (_, i) => (
      <Rect key={i} x={0} y={22 - i * 6} width="42" height="10" rx="4" fill={i === count - 1 ? theme.accent : theme.ink} fillOpacity={i === count - 1 ? 0.72 : 0.12 + i * 0.06} stroke={theme.ink} strokeWidth="1.2" />
    ))}
  </G>
);

function BusinessScene({ name, theme }: { name: SceneName; theme: SceneTheme }) {
  if (name === 'cash-vs-profit') {
    return <><Label x={57} y={24} theme={theme}>PROFIT</Label><Label x={183} y={24} theme={theme}>CASH</Label><G transform="translate(24 37)"><Rect width="66" height="58" rx="13" fill={theme.ink} fillOpacity="0.08" /><Path d="M14 43l14-17 10 9 15-22" fill="none" stroke={theme.ink} strokeWidth="3" /><Path d="M49 13h6v6" fill="none" stroke={theme.ink} strokeWidth="2" /></G><SvgText x="120" y="72" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="22" textAnchor="middle">≠</SvgText><G transform="translate(151 37)"><Rect width="66" height="58" rx="13" fill={theme.accent} fillOpacity="0.3" /><MoneyStack x={12} y={17} count={4} theme={theme} /></G></>;
  }
  if (name === 'accrual-timing') {
    return <><G transform="translate(18 27)"><Rect width="65" height="72" rx="12" fill={theme.ink} fillOpacity="0.08" /><Path d="M13 20h39M13 33h30M13 46h34" stroke={theme.ink} strokeWidth="2" /><Label x={32} y={64} theme={theme}>INVOICE</Label></G><Arrow x1={88} y1={62} x2={145} y2={62} theme={theme} dashed /><G transform="translate(155 28)"><Circle cx="31" cy="31" r="29" fill={theme.accent} fillOpacity="0.28" stroke={theme.ink} strokeWidth="2" /><Path d="M31 14v18l12 8" fill="none" stroke={theme.ink} strokeWidth="3" /><Label x={31} y={76} theme={theme}>CASH LATER</Label></G></>;
  }
  if (name === 'noncash-charge') {
    return <><G transform="translate(20 27)"><Rect width="72" height="72" rx="14" fill={theme.ink} fillOpacity="0.08" /><Path d="M18 51V23h36v28M12 51h48M29 32v11M43 32v11" fill="none" stroke={theme.ink} strokeWidth="2" /><Label x={36} y={66} theme={theme}>ASSET</Label></G><Arrow x1={101} y1={62} x2={143} y2={62} theme={theme} /><G transform="translate(153 27)"><Rect width="66" height="72" rx="14" fill={theme.accent} fillOpacity="0.24" /><Path d="M14 22h38M14 35h31M14 48h22" stroke={theme.ink} strokeWidth="2" strokeDasharray="4 3" /><Label x={33} y={66} theme={theme}>EXPENSE</Label></G></>;
  }
  if (name === 'free-cash-flow') {
    return <><MoneyStack x={18} y={28} count={6} theme={theme} /><Label x={39} y={92} theme={theme}>CASH IN</Label><SvgText x="82" y="65" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="20" textAnchor="middle">−</SvgText><G transform="translate(96 30)"><Rect width="48" height="52" rx="10" fill={theme.ink} fillOpacity="0.1" /><Path d="M10 39V20l14-9 14 9v19M6 39h36" fill="none" stroke={theme.ink} strokeWidth="2" /><Label x={24} y={65} theme={theme}>CAPEX</Label></G><SvgText x="160" y="65" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="20" textAnchor="middle">=</SvgText><MoneyStack x={181} y={34} count={3} theme={theme} /><Label x={202} y={92} theme={theme}>FREE CASH</Label></>;
  }
  if (name === 'dividend-per-share') {
    return <><MoneyStack x={18} y={25} count={5} theme={theme} /><Arrow x1={68} y1={61} x2={104} y2={61} theme={theme} />{[0,1,2].map(i=><G key={i} transform={`translate(${112+i*39} 35)`}><Circle cx="14" cy="14" r="14" fill={theme.accent} fillOpacity={0.25+i*0.12} stroke={theme.ink} strokeWidth="1.5" /><SvgText x="14" y="19" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="14" textAnchor="middle">$</SvgText></G>)}<Label x={163} y={88} theme={theme}>CASH PER SHARE</Label></>;
  }
  if (name === 'payout-pressure') {
    return <><G transform="translate(23 32)"><Circle cx="43" cy="43" r="38" fill="none" stroke={theme.ink} strokeOpacity="0.15" strokeWidth="12" /><Path d="M43 5a38 38 0 0136 50" fill="none" stroke={theme.accent} strokeWidth="12" strokeLinecap="round" /><SvgText x="43" y="49" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="17" textAnchor="middle">85%</SvgText></G><G transform="translate(132 24)"><Rect width="82" height="82" rx="14" fill={theme.ink} fillOpacity="0.08" /><MoneyStack x={20} y={22} count={2} theme={theme} /><Label x={41} y={68} theme={theme}>CUSHION</Label></G></>;
  }
  if (name === 'buyback-slices') {
    return <><Label x={58} y={22} theme={theme}>BEFORE</Label><Label x={182} y={22} theme={theme}>AFTER</Label><G transform="translate(25 34)">{[0,1,2,3].map(i=><Rect key={i} x={(i%2)*34} y={Math.floor(i/2)*34} width="29" height="29" rx="7" fill={theme.ink} fillOpacity="0.12" />)}</G><Arrow x1={102} y1={66} x2={137} y2={66} theme={theme} /><G transform="translate(151 34)">{[0,1,2].map(i=><Rect key={i} x={(i%2)*34} y={Math.floor(i/2)*34} width="29" height="29" rx="7" fill={i===0?theme.accent:theme.ink} fillOpacity={i===0?0.7:0.12} />)}</G><Label x={181} y={112} theme={theme}>BIGGER SLICE</Label></>;
  }
  if (name === 'yield-trap') {
    return <><G transform="translate(22 24)"><Rect width="88" height="78" rx="14" fill={theme.accent} fillOpacity="0.25" /><SvgText x="44" y="47" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="25" textAnchor="middle">12%</SvgText><Label x={44} y={67} theme={theme}>YIELD</Label></G><G transform="translate(137 24)"><Path d="M8 14h70L57 74H29z" fill={theme.ink} fillOpacity="0.1" stroke={theme.ink} strokeWidth="2" /><Path d="M30 39h27" stroke={theme.accent} strokeWidth="4" /><Label x={43} y={94} theme={theme}>PRICE FALL</Label></G></>;
  }
  if (name === 'competition-cycle') {
    return <><G transform="translate(18 33)"><Rect width="62" height="62" rx="14" fill={theme.accent} fillOpacity="0.28" /><Path d="M15 46l12-14 9 7 12-20" fill="none" stroke={theme.ink} strokeWidth="3" /><Label x={31} y={57} theme={theme}>PROFIT</Label></G><Arrow x1={86} y1={64} x2={121} y2={64} theme={theme} /><G transform="translate(130 30)"><Rect width="84" height="68" rx="14" fill={theme.ink} fillOpacity="0.08" />{[0,1,2].map(i=><Path key={i} d={`M${16+i*23} 48V28l8-7 8 7v20`} fill="none" stroke={theme.ink} strokeWidth="2" />)}<Label x={42} y={61} theme={theme}>RIVALS</Label></G></>;
  }
  if (name === 'moat-defense' || name === 'customer-moat') {
    const customer = name === 'customer-moat';
    return <><G transform="translate(72 19)"><Rect x="18" y="23" width="60" height="70" rx="12" fill={theme.accent} fillOpacity="0.24" stroke={theme.ink} strokeWidth="2" /><Path d="M29 70V42l19-12 19 12v28M23 70h50" fill="none" stroke={theme.ink} strokeWidth="2" /><Path d="M8 18c-21 16-21 68 0 86M88 18c21 16 21 68 0 86" fill="none" stroke={theme.ink} strokeWidth="5" strokeLinecap="round" /><Label x={48} y={88} theme={theme}>{customer?'CUSTOMERS':'PROFIT'}</Label></G><MutedLabel x={120} y={121} theme={theme}>{customer?'HARD TO LEAVE':'HARD TO ATTACK'}</MutedLabel></>;
  }
  if (name === 'moat-erosion') {
    return <><Path d="M20 87C52 33 83 32 112 65s58 31 108-22" fill="none" stroke={theme.ink} strokeOpacity="0.18" strokeWidth="12" /><Path d="M21 87C51 38 81 42 111 70s60 26 108-11" fill="none" stroke={theme.accent} strokeWidth="3" strokeDasharray="9 7" /><Path d="M105 45l14 22-20 15" fill={theme.bg} stroke={theme.ink} strokeWidth="2" /><Label x={120} y={25} theme={theme}>MOAT NARROWS</Label></>;
  }
  if (name === 'gross-margin' || name === 'operating-margin') {
    const operating = name === 'operating-margin';
    const items = operating ? [['REVENUE',100],['PRODUCT',62],['RUNNING',24],['KEPT',14]] : [['SALE',100],['PRODUCT',62],['GROSS',38]];
    return <>{items.map(([label,value],i)=><G key={String(label)} transform={`translate(18 ${18+i*27})`}><Rect width={Number(value)*1.9} height="18" rx="5" fill={i===items.length-1?theme.accent:theme.ink} fillOpacity={i===items.length-1?0.68:0.09+i*0.04} /><Label x={7} y={13} anchor="start" theme={theme}>{label}</Label><MutedLabel x={220} y={13} anchor="end" theme={theme}>{`${value}%`}</MutedLabel></G>)}</>;
  }
  if (name === 'income-waterfall') {
    const bars=[['REVENUE',100],['GROSS',58],['OPERATING',25],['NET',14]];
    return <>{bars.map(([label,value],i)=><G key={String(label)} transform={`translate(${18+i*55} ${105-Number(value)*.7})`}><Rect width="42" height={Number(value)*.7} rx="7" fill={i===3?theme.accent:theme.ink} fillOpacity={i===3?.68:.08+i*.06} /><MutedLabel x={21} y={Number(value)*.7+14} theme={theme}>{label}</MutedLabel></G>)}</>;
  }
  if (name === 'revenue-profit-diverge') {
    return <><Path d="M18 99l40-15 40-18 40-21 40-18 43-11" fill="none" stroke={theme.accent} strokeWidth="4" /><Path d="M18 78l40 2 40 7 40 8 40 10 43 8" fill="none" stroke={theme.ink} strokeWidth="4" /><Label x={183} y={21} anchor="start" theme={theme}>REVENUE</Label><Label x={177} y={124} anchor="start" theme={theme}>PROFIT</Label></>;
  }
  if (name === 'pe-equation') {
    return <><G transform="translate(20 31)"><Rect width="72" height="62" rx="13" fill={theme.ink} fillOpacity="0.08" /><SvgText x="36" y="37" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="20" textAnchor="middle">$60</SvgText><Label x={36} y={55} theme={theme}>PRICE</Label></G><SvgText x="112" y="70" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="22" textAnchor="middle">÷</SvgText><G transform="translate(132 31)"><Rect width="72" height="62" rx="13" fill={theme.ink} fillOpacity="0.08" /><SvgText x="36" y="37" fill={theme.ink} fontFamily="Inter_700Bold" fontSize="20" textAnchor="middle">$3</SvgText><Label x={36} y={55} theme={theme}>EPS</Label></G><SvgText x="220" y="70" fill={theme.accent} fontFamily="Inter_700Bold" fontSize="18" textAnchor="middle">20×</SvgText></>;
  }
  if (name === 'pe-payback') {
    return <><G transform="translate(17 26)"><Rect width="206" height="76" rx="14" fill={theme.ink} fillOpacity="0.07" />{Array.from({length:10},(_,i)=><Rect key={i} x={11+i*19} y="20" width="13" height="36" rx="4" fill={i<4?theme.accent:theme.ink} fillOpacity={i<4?.68:.12} />)}<Label x={103} y={69} theme={theme}>YEARS OF CURRENT EARNINGS</Label></G></>;
  }
  return <><G transform="translate(19 26)"><Rect width="202" height="76" rx="14" fill={theme.ink} fillOpacity="0.07" /><Path d="M16 20l36 10 34 12 36 13 32 8 31 7" fill="none" stroke={theme.accent} strokeWidth="4" /><Path d="M16 56h169" stroke={theme.ink} strokeOpacity="0.2" strokeWidth="2" /><Path d="M151 48l17 15-17 15" fill="none" stroke={theme.ink} strokeWidth="2" /><Label x={101} y={69} theme={theme}>CHEAP FOR A REASON</Label></G></>;
}

function sceneFor(name: SceneName, theme: SceneTheme) {
  if (['ownership-slice', 'share-ledger', 'equity-vs-debt', 'owner-outcomes'].includes(name)) return <OwnershipScene name={name} theme={theme} />;
  if (['capital-journey', 'ipo-launch', 'primary-secondary', 'liquidity-exit'].includes(name)) return <CapitalScene name={name} theme={theme} />;
  if (['market-cap-equation', 'price-vs-value', 'size-spectrum'].includes(name)) return <ValuationScene name={name} theme={theme} />;
  if (['order-route', 'matching-engine', 'broker-agent', 'order-book', 'execution-tradeoff', 'stop-trigger'].includes(name)) return <MarketStructureScene name={name} theme={theme} />;
  if (['two-sided-market', 'spread-toll', 'liquidity-depth'].includes(name)) return <TradingScene name={name} theme={theme} />;
  if (['quote-terminal', 'price-change', 'event-gap', 'quote-signal'].includes(name)) return <QuoteScene name={name} theme={theme} />;
  if (['trade-agreement', 'supply-demand', 'expectations-gap'].includes(name)) return <PriceScene name={name} theme={theme} />;
  if (['cash-vs-profit', 'accrual-timing', 'noncash-charge', 'free-cash-flow', 'dividend-per-share', 'payout-pressure', 'buyback-slices', 'yield-trap', 'competition-cycle', 'moat-defense', 'customer-moat', 'moat-erosion', 'gross-margin', 'operating-margin', 'income-waterfall', 'revenue-profit-diverge', 'pe-equation', 'pe-payback', 'value-trap'].includes(name)) return <BusinessScene name={name} theme={theme} />;
  return <IndexScene name={name} theme={theme} />;
}

/** A concept-specific, data-like SVG scene with a gentle explanatory reveal. */
export function SceneArt({ name, palette, alt, active }: SceneArtProps) {
  const theme = artPalettes[palette];
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active && !reduceMotion ? 0 : 1);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = reduceMotion
      ? 1
      : withDelay(100, withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }));
  }, [active, progress, reduceMotion]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ translateY: (1 - progress.value) * 10 }, { scale: 0.97 + progress.value * 0.03 }],
  }));
  // Travel fully beyond both edges. Ending at +260 left part of the sheen
  // parked over a phone-width panel after the entrance animation finished.
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -80 + progress.value * 500 }] }));

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]} accessibilityRole="image" accessibilityLabel={alt}>
      <Animated.View style={[styles.canvas, enterStyle]}>
        <Svg width="100%" height="100%" viewBox="0 0 240 128">
          <Path d="M12 114H228" stroke={theme.ink} strokeOpacity={0.08} strokeWidth="1" />
          <Path d="M12 14H228" stroke={theme.ink} strokeOpacity={0.05} strokeWidth="1" />
          {sceneFor(name, theme)}
        </Svg>
      </Animated.View>
      {!reduceMotion && active ? <Animated.View style={[styles.sweep, { backgroundColor: theme.accent }, sweepStyle]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', overflow: 'hidden' },
  canvas: { flex: 1, width: '100%' },
  sweep: { position: 'absolute', top: 0, bottom: 0, width: 48, opacity: 0.08, transform: [{ skewX: '-12deg' }] },
});
