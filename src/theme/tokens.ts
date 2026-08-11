/**
 * Design tokens.
 *
 * A plain TypeScript module rather than NativeWind/Tamagui: StockIQ is about
 * a dozen bespoke, art-directed surfaces (seven card layouts, the unit path,
 * the grids), not a 200-screen CRUD app where a utility framework amortises.
 * A token file plus a handful of primitives gives the same consistency with
 * no extra build pipeline and trivial Reanimated interop.
 *
 * The palette was sampled from Imprint's app as a visual reference on the
 * first pass. Those screenshots are not in this repo — they are another
 * company's copyrighted UI — so the values below are the record. Treat them
 * as the source of truth rather than re-deriving them from anything external.
 */

export const palette = {
  /** Brand surface — the green behind "Choose your course." */
  forest: '#2E8B6B',
  /** Deeper green used for full-bleed marketing panels and KB headers. */
  forestDeep: '#1D5E4A',
  forestInk: '#154336',

  /** Progress-bar fill and the active tap-zone divider. */
  mint: '#00E5A0',
  /** The accent word in a two-tone headline ("**Bite-Sized** Lessons"). */
  mintSoft: '#A8E6A3',

  ink: '#1A1A1A',
  inkSoft: '#3A3A3A',
  paper: '#FFFFFF',
  paperWarm: '#FAFAF8',
  slate: '#6B7280',
  slateLight: '#9CA3AF',
  hairline: '#E5E5E3',

  /** Primary quiz option and the star nodes on the unit path. */
  violet: '#8B5CF6',
  violetSoft: '#E9DEFB',
  violetInk: '#5B3B8B',

  /** The floating word-bank panel and the inline blank chip. */
  azure: '#4A90E2',
  azureSoft: '#DDEAF9',

  emerald: '#4ADE80',
  emeraldDeep: '#22A55B',
  flame: '#F97316',
  flameSoft: '#FDBA74',

  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  success: '#16A34A',
  successSoft: '#DCFCE7',

  /** ASK button gradient stops. */
  askFrom: '#C264D9',
  askTo: '#F5A05A',
} as const;

/**
 * Pastel panels for card art. Deliberately short — coherence beats variety,
 * and a small reused set reads as a design system where a large one reads as
 * inconsistency. `ink` is the foreground colour to draw on that background.
 */
export const artPalettes = {
  blush: { bg: '#F9E3E0', ink: '#8B3A2E', accent: '#D9776A' },
  lilac: { bg: '#EDE4F9', ink: '#5B3B8B', accent: '#8B5CF6' },
  sky: { bg: '#DDEAF9', ink: '#1E4E82', accent: '#4A90E2' },
  mint: { bg: '#DCF2E4', ink: '#1D5E4A', accent: '#22A55B' },
  butter: { bg: '#FBF0D2', ink: '#8A6410', accent: '#E0A82E' },
  /** High-voltage green — reserved for profit/payoff charts. */
  neon: { bg: '#00E36A', ink: '#0A0A0A', accent: '#0A0A0A' },
  ink: { bg: '#1A1A1A', ink: '#FFFFFF', accent: '#00E5A0' },
  forest: { bg: '#1D5E4A', ink: '#FFFFFF', accent: '#A8E6A3' },
  /** Warm cream ground + earthy ink — the flat-illustration family, for the
   *  everyday bar/line/compounding charts. Accent is a valence-neutral ochre. */
  parchment: { bg: '#F4ECD6', ink: '#22403A', accent: '#C9822E' },
} as const;

export type ArtPaletteName = keyof typeof artPalettes;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  card: 28,
  pill: 999,
} as const;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * Imprint's headline face is a geometric sans with a single-storey 'a'
 * (Sofia Pro / Gilroy family, both commercially licensed). Poppins is the
 * closest freely licensed match and reads near-identically at display sizes.
 * Inter carries body and UI text, where density matters more than character.
 */
export const fontFamily = {
  displayBold: 'Poppins_700Bold',
  displaySemi: 'Poppins_600SemiBold',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const type = {
  display: {
    fontFamily: fontFamily.displayBold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
  },
  h1: {
    fontFamily: fontFamily.displayBold,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.4,
  },
  h2: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 22,
    lineHeight: 29,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 18,
    lineHeight: 28,
  },
  bodyEm: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 18,
    lineHeight: 28,
  },
  bodySm: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  /** The italic line on the black half of a key_insight poster. */
  insight: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 19,
    lineHeight: 27,
    fontStyle: 'italic' as const,
  },
  /** All-caps micro labels: unit banners, sticker chips, attribution. */
  label: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.1,
  },
  caption: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    lineHeight: 22,
  },
} as const;

export type TypeVariant = keyof typeof type;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  sticker: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;

/** Shared motion constants so transitions feel like one system. */
export const motion = {
  spring: { damping: 20, stiffness: 220, mass: 0.9 },
  quick: 180,
  normal: 260,
} as const;
