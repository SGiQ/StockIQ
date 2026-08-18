import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Glyph } from '@/components/art/Glyph';
import { PillButton, Text } from '@/components/primitives';
import { fontFamily, palette, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

const FEATURES = [
  {
    icon: 'clock' as const,
    title: 'Two-minute lessons',
    body: 'Bite-sized cards that teach one idea at a time — tap through at your pace.',
  },
  {
    icon: 'chart-up' as const,
    title: 'Real charts, real concepts',
    body: 'Illustrated explanations of candlesticks, support levels, moving averages, and more.',
  },
  {
    icon: 'brain' as const,
    title: 'Quizzes that stick',
    body: 'Every lesson tests you. Spaced review brings concepts back before you forget.',
  },
];

const CAPABILITIES = [
  {
    icon: 'coins-stack' as const,
    title: 'Paper trading',
    body: 'Practice buying and selling real stocks with $10K in virtual cash. Track your portfolio, watch it grow, and learn from AI coaching — zero risk.',
  },
  {
    icon: 'lightbulb' as const,
    title: 'AI tutor',
    body: 'Ask anything about investing and get a clear, jargon-free answer. Works inside lessons too — tap to ask about what you just learned.',
  },
  {
    icon: 'eye' as const,
    title: 'Watchlist',
    body: 'Follow the stocks you care about. When a price moves, tap "Explain this move" and the AI tells you why — connected to the concepts you\'re learning.',
  },
  {
    icon: 'key' as const,
    title: 'Unlock strategies',
    body: 'Value investing, momentum, CANSLIM, and more. Each strategy unlocks only after you finish the lessons that explain it — so you actually understand it.',
  },
];

const SOCIAL_PROOF = [
  { stat: '56', label: 'lessons across 9 courses' },
  { stat: '86', label: 'terms in the glossary' },
  { stat: '7', label: 'real investing strategies' },
  { stat: '8', label: 'legendary trader profiles' },
];

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to start learning.',
    features: [
      'All 56 lessons',
      'Streaks, XP, and badges',
      'Paper trading',
      'Knowledge Base previews',
      '5 hearts per session',
      '3 AI tutor questions / day',
    ],
    highlight: false,
    cta: 'Get started',
  },
  {
    name: 'Pro',
    price: '$5',
    period: '/mo billed yearly',
    altPrice: '$9.99/mo',
    description: 'Learn without limits.',
    features: [
      'Everything in Free',
      'Unlimited hearts',
      'Unlimited AI tutor',
      'Full Knowledge Base',
      'Spaced-repetition review',
      'Monthly streak repair',
      'No ads',
    ],
    highlight: true,
    cta: 'Start free trial',
  },
  {
    name: 'Elite',
    price: '$10',
    period: '/mo billed yearly',
    altPrice: '$19.99/mo',
    description: 'AI-powered coaching for serious learners.',
    features: [
      'Everything in Pro',
      'Personalized coaching path',
      '"Explain this ticker" AI',
      'Socratic AI mode',
      'Portfolio-simulator lessons',
      'Priority new content',
    ],
    highlight: false,
    cta: 'Start free trial',
  },
] as const;

export default function LandingPage() {
  const router = useRouter();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const wide = width >= 1200;
  // Sections need to fill the viewport on mobile so a coloured background
  // (dark green cap section, etc) reads as full-bleed rather than a floating
  // panel with white gutters. The content inside stays inset via
  // `paddingHorizontal`, keeping a comfortable side margin around the cards.
  const compactSection = compact ? { width: '100%' as const, paddingHorizontal: space.lg } : null;
  const heroSource = require('../public/lesson-art/ownership.jpg');

  return (
    <ScrollView style={[styles.page, { backgroundColor: colors.paperWarm }]} contentContainerStyle={styles.pageContent}>
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <View style={[styles.nav, compact && styles.navCompact, compactSection]}>
        <Image
          source={require('../public/logo/SG.png')}
          contentFit="contain"
          style={styles.brandMark}
          accessibilityLabel="StockiQ"
        />
        <Text variant="h2">StockiQ</Text>
        <View style={styles.navSpacer} />
        {!compact ? (
          <PillButton
            label="Sign in"
            variant="ghost"
            fullWidth={false}
            style={styles.navButton}
            onPress={() => router.push('/sign-in')}
          />
        ) : null}
      </View>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <View style={[styles.hero, compact && styles.heroCompact, compactSection]}>
        <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
          <View style={styles.eyebrow}>
            <Text variant="label" color={palette.forestDeep} uppercase>Learn investing visually</Text>
          </View>
          <Text style={[styles.heroTitle, compact && styles.heroTitleCompact, wide && styles.heroTitleWide]}>
            Understand the market.{'\n'}Build your own judgment.
          </Text>
          <Text variant="body" color={colors.inkSoft} style={[styles.heroBody, wide && styles.heroBodyWide]}>
            56 visual lessons. Paper trading with real stocks. An AI tutor that explains anything. All in two minutes a day.
          </Text>
          <View style={[styles.actions, compact && styles.actionsCompact]}>
            <PillButton label="Start learning — it's free" onPress={() => router.push('/(onboarding)/welcome')} />
            <PillButton label="I already have an account" variant="ghost" onPress={() => router.push('/sign-in')} />
          </View>
          <Text variant="caption" color={colors.slate}>Educational content — not individualized financial advice.</Text>
        </View>

        <View style={[styles.artShell, compact && styles.artShellCompact]}>
          <Image source={heroSource} style={styles.heroArt} contentFit="cover" transition={250} />
          <View style={styles.artCaption}>
            <Text variant="label" color={palette.mintSoft} uppercase>Lesson 1</Text>
            <Text variant="h2" color={colors.paper}>A stock is ownership.</Text>
          </View>
        </View>
      </View>

      {/* ── Social proof strip ──────────────────────────────────────── */}
      <View style={[styles.proofStrip, compactSection, compact && styles.proofStripCompact]}>
        {SOCIAL_PROOF.map((item) => (
          <View key={item.label} style={styles.proofItem}>
            <Text color={palette.forestDeep} style={[styles.proofStat, wide && styles.proofStatWide]}>{item.stat}</Text>
            <Text variant={wide ? 'body' : 'bodySm'} color={colors.inkSoft}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ── How it works ────────────────────────────────────────────── */}
      <View style={[styles.section, { backgroundColor: colors.paperWarm }, compactSection, compact && styles.roundedSection]}>
        <Text variant="label" color={palette.forestDeep} uppercase align="center">How it works</Text>
        <Text variant="h1" align="center">From curious beginner to confident thinker.</Text>
        <View style={[styles.featureGrid, compact && styles.featureGridCompact]}>
          {FEATURES.map((feature) => (
            <View key={feature.title} style={[styles.featureCard, { backgroundColor: colors.paper, borderColor: colors.hairline }]}>
              <View style={styles.featureIcon}>
                <Glyph name={feature.icon} size={24} color={palette.forestDeep} />
              </View>
              <Text variant="h3">{feature.title}</Text>
              <Text variant="bodySm" color={colors.inkSoft}>{feature.body}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Capabilities (the depth) ────────────────────────────────── */}
      <View style={[styles.capSection, compactSection, compact && styles.roundedSection]}>
        <Text variant="label" color={palette.mintSoft} uppercase align="center">More than lessons</Text>
        <Text variant="h1" color={colors.paper} align="center">Practice what you learn.</Text>
        <Text variant="body" color={palette.mintSoft} align="center" style={styles.capSub}>
          Paper trade real stocks. Ask an AI tutor anything. Watch the market and connect it to what you're learning.
        </Text>
        <View style={[styles.capGrid, compact && styles.capGridCompact]}>
          {CAPABILITIES.map((cap) => (
            <View key={cap.title} style={styles.capCard}>
              <View style={styles.capIcon}>
                <Glyph name={cap.icon} size={22} color={palette.mint} />
              </View>
              <Text variant="h3" color={colors.paper}>{cap.title}</Text>
              <Text variant="bodySm" color={palette.mintSoft}>{cap.body}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Gamification strip ──────────────────────────────────────── */}
      <View style={[styles.section, { backgroundColor: colors.paper }, compactSection, compact && styles.roundedSection]}>
        <Text variant="label" color={palette.forestDeep} uppercase align="center">Stay motivated</Text>
        <Text variant="h1" align="center">Built to keep you coming back.</Text>
        <View style={[styles.gameGrid, compact && styles.gameGridCompact]}>
          <View style={styles.gameItem}>
            <Text style={styles.gameEmoji}>🔥</Text>
            <Text variant="h3">Daily streaks</Text>
            <Text variant="bodySm" color={colors.inkSoft}>Set a daily goal. Build a streak. Use streak freezes to protect it on busy days.</Text>
          </View>
          <View style={styles.gameItem}>
            <Text style={styles.gameEmoji}>⭐</Text>
            <Text variant="h3">XP and badges</Text>
            <Text variant="bodySm" color={colors.inkSoft}>Earn XP for every lesson. Unlock 13 badges from First Steps to Full Curriculum.</Text>
          </View>
          <View style={styles.gameItem}>
            <Text style={styles.gameEmoji}>🧠</Text>
            <Text variant="h3">Market Readiness</Text>
            <Text variant="bodySm" color={colors.inkSoft}>A 0–100 score that tracks your actual investing knowledge across six dimensions.</Text>
          </View>
          <View style={styles.gameItem}>
            <Text style={styles.gameEmoji}>🏆</Text>
            <Text variant="h3">Leagues</Text>
            <Text variant="bodySm" color={colors.inkSoft}>Compete weekly with other learners. Climb from Bronze to Diamond based on real progress.</Text>
          </View>
        </View>
      </View>

      {/* ── Knowledge Base tease ────────────────────────────────────── */}
      <View style={[styles.kbSection, { backgroundColor: colors.paperWarm }, compactSection, compact && styles.roundedSection]}>
        <View style={[styles.kbInner, wide && styles.kbInnerWide]}>
          <Text variant="label" color={palette.forestDeep} uppercase>Knowledge Base</Text>
          <Text variant="h1" style={styles.kbTitle}>
            Learn from the greatest investors in history.
          </Text>
          <Text variant="body" color={colors.inkSoft} style={styles.kbBody}>
            Read the strategies of Buffett, Lynch, and Dalio. Study 5 classic investing books as interactive card decks. Browse 86 terms in plain English. Every strategy unlocks only after you finish the lessons — so you actually understand what you're using.
          </Text>
          <View style={styles.kbChips}>
            {['Warren Buffett', 'Peter Lynch', 'Ray Dalio', 'Jesse Livermore', 'Value Investing', 'CANSLIM', 'Momentum'].map((name) => (
              <View key={name} style={styles.kbChip}>
                <Text variant="label" color={palette.forestDeep}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <View style={[styles.pricingSection, { backgroundColor: colors.paper }, compactSection, compact && styles.roundedSection]}>
        <Text variant="label" color={palette.forestDeep} uppercase align="center">Simple pricing</Text>
        <Text variant="h1" align="center">Pick your pace.</Text>
        <Text variant="body" color={colors.inkSoft} align="center" style={styles.pricingSub}>
          Every lesson is free. Upgrade when you want unlimited AI, unlimited hearts, and the full Knowledge Base.
        </Text>
        <View style={[styles.tierGrid, compact && styles.tierGridCompact]}>
          {TIERS.map((tier) => (
            <View
              key={tier.name}
              style={[
                styles.tierCard,
                { backgroundColor: colors.paperWarm, borderColor: colors.hairline },
                tier.highlight && styles.tierCardHighlight,
              ]}
            >
              {tier.highlight && (
                <View style={styles.tierBadge}>
                  <Text variant="label" color={colors.paper} uppercase>Most popular</Text>
                </View>
              )}
              <Text variant="h2" color={tier.highlight ? colors.paper : colors.ink}>{tier.name}</Text>
              <View style={styles.tierPriceRow}>
                <Text color={tier.highlight ? colors.paper : colors.ink} style={styles.tierPrice}>{tier.price}</Text>
                <Text variant="bodySm" color={tier.highlight ? palette.mintSoft : colors.slate}>{tier.period}</Text>
              </View>
              {'altPrice' in tier && tier.altPrice ? (
                <Text variant="caption" color={tier.highlight ? palette.mintSoft : colors.slate}>
                  {`or ${tier.altPrice} monthly`}
                </Text>
              ) : null}
              <Text variant="bodySm" color={tier.highlight ? palette.mintSoft : colors.inkSoft} style={styles.tierDesc}>
                {tier.description}
              </Text>
              <View style={styles.tierDivider} />
              {tier.features.map((f) => (
                <View key={f} style={styles.tierFeatureRow}>
                  <Text variant="bodySm" color={tier.highlight ? palette.mint : palette.emeraldDeep}>✓</Text>
                  <Text variant="bodySm" color={tier.highlight ? colors.paper : colors.ink}>{f}</Text>
                </View>
              ))}
              <View style={styles.tierCtaWrap}>
                <PillButton
                  label={tier.cta}
                  variant={tier.highlight ? 'light' : 'ghost'}
                  onPress={() => router.push('/(onboarding)/welcome')}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── Final CTA ───────────────────────────────────────────────── */}
      <View style={[styles.finalCta, compactSection, compact && styles.roundedSection]}>
        <Text variant="h1" color={colors.paper} align="center">Make the market make sense.</Text>
        <Text variant="body" color={palette.mintSoft} align="center">
          Nine courses. Paper trading. An AI that never gets tired of your questions. Start for free.
        </Text>
        <PillButton label="Begin with Market Foundations" variant="light" fullWidth={false} onPress={() => router.push('/(onboarding)/welcome')} />
      </View>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <View style={[styles.footer, compactSection]}>
        <Text variant="h3">StockiQ</Text>
        <Text variant="caption" color={colors.slate}>Learn clearly. Invest thoughtfully.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, overflow: 'hidden' },
  pageContent: { alignItems: 'center', flexGrow: 1, flexShrink: 1, flexBasis: '100%' },

  nav: { width: '100%', maxWidth: 1280, minHeight: 82, paddingHorizontal: space.xl, boxSizing: 'border-box', flexDirection: 'row', alignItems: 'center', gap: space.sm },
  navCompact: { alignSelf: 'center' },
  brandMark: { width: 40, height: 40, borderRadius: 10 },
  navSpacer: { flex: 1 },
  navButton: { minHeight: 44, paddingVertical: space.sm, paddingHorizontal: space.lg },

  hero: { width: '100%', maxWidth: 1280, paddingHorizontal: space.xl, paddingTop: 56, paddingBottom: 88, boxSizing: 'border-box', flexDirection: 'row', alignItems: 'center', gap: 72 },
  heroCompact: { alignSelf: 'center', flexDirection: 'column', paddingTop: space.xl, paddingBottom: 56, gap: space.xl },
  heroCopy: { flex: 1, gap: space.lg },
  // In column layout the parent-side `flex: 1` / `flex: 0.82` on these
  // children forces them to divvy the parent's height with flex-basis 0 —
  // content overflowed its computed share and the disclaimer landed on top of
  // the hero art. Reset all three flex axes so each block sizes to its own
  // content (heroCopy) or its own aspect-ratio (artShell).
  heroCopyCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', alignSelf: 'stretch' },
  eyebrow: { alignSelf: 'flex-start', backgroundColor: '#DCEBDD', borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.sm },
  heroTitle: { fontFamily: fontFamily.displayBold, fontSize: 56, lineHeight: 62, letterSpacing: -1.4 },
  heroTitleCompact: { fontSize: 40, lineHeight: 47, letterSpacing: -0.8 },
  heroTitleWide: { fontSize: 64, lineHeight: 70, letterSpacing: -1.6 },
  heroBody: { maxWidth: 570 },
  heroBodyWide: { fontSize: 20, lineHeight: 30 },
  actions: { maxWidth: 420, gap: space.sm },
  actionsCompact: { maxWidth: undefined, width: '100%' },
  artShell: { flex: 0.82, minWidth: 0, width: '100%', maxWidth: 520, aspectRatio: 0.82, borderRadius: 36, overflow: 'hidden', backgroundColor: palette.forestDeep, ...shadow.floating },
  // Same story as the copy block: reset all three flex axes so the shell
  // stops trying to fill the column and lets its aspect-ratio compute a real
  // height from the row-full width.
  artShellCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', alignSelf: 'stretch', width: '100%' },
  heroArt: { width: '100%', height: '76%' },
  artCaption: { flex: 1, backgroundColor: palette.forestDeep, padding: space.lg, justifyContent: 'center', gap: space.xs },

  proofStrip: { width: '100%', maxWidth: 1280, paddingHorizontal: space.xl, paddingVertical: space.xxl, boxSizing: 'border-box', flexDirection: 'row', justifyContent: 'space-around', gap: space.lg },
  proofStripCompact: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  proofItem: { alignItems: 'center', minWidth: 120, paddingVertical: space.sm },
  proofStat: { fontFamily: fontFamily.displayBold, fontSize: 36, lineHeight: 42 },
  proofStatWide: { fontSize: 48, lineHeight: 54 },

  section: { width: '100%', alignSelf: 'stretch', paddingHorizontal: space.lg, paddingVertical: 80, boxSizing: 'border-box', alignItems: 'center', gap: space.md },
  roundedSection: { borderRadius: radius.lg, marginBottom: space.lg },

  featureGrid: { width: '100%', maxWidth: 1200, flexDirection: 'row', gap: space.lg, marginTop: space.xl },
  featureGridCompact: { flexDirection: 'column' },
  featureCard: { flex: 1, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: 1 },
  featureIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: '#DCEBDD', alignItems: 'center', justifyContent: 'center' },

  capSection: { width: '100%', alignSelf: 'stretch', backgroundColor: palette.forestDeep, paddingHorizontal: space.lg, paddingVertical: 80, boxSizing: 'border-box', alignItems: 'center', gap: space.md },
  capSub: { maxWidth: 560, marginBottom: space.sm },
  capGrid: { width: '100%', maxWidth: 1200, flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, marginTop: space.md },
  capGridCompact: { flexDirection: 'column' },
  capCard: { flex: 1, minWidth: 240, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.lg, padding: space.lg, gap: space.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  capIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(0,229,160,0.15)', alignItems: 'center', justifyContent: 'center' },

  gameGrid: { width: '100%', maxWidth: 1200, flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, marginTop: space.xl },
  gameGridCompact: { flexDirection: 'column' },
  gameItem: { flex: 1, minWidth: 220, gap: space.sm, padding: space.md },
  gameEmoji: { fontSize: 32, lineHeight: 38 },

  kbSection: { width: '100%', alignSelf: 'stretch', paddingHorizontal: space.lg, paddingVertical: 80, boxSizing: 'border-box', alignItems: 'center' },
  kbInner: { maxWidth: 720, gap: space.md },
  kbInnerWide: { maxWidth: 900 },
  kbTitle: { maxWidth: 520 },
  kbBody: { maxWidth: 620 },
  kbChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  kbChip: { backgroundColor: '#DCEBDD', borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs + 2 },

  pricingSection: { width: '100%', alignSelf: 'stretch', paddingHorizontal: space.lg, paddingVertical: 80, boxSizing: 'border-box', alignItems: 'center', gap: space.md },
  pricingSub: { maxWidth: 520, marginBottom: space.md },
  tierGrid: { width: '100%', maxWidth: 1200, flexDirection: 'row', gap: space.lg, marginTop: space.md, alignItems: 'stretch' },
  tierGridCompact: { flexDirection: 'column' },
  tierCard: { flex: 1, borderRadius: radius.lg, padding: space.lg, gap: space.sm, borderWidth: 1 },
  tierCardHighlight: { backgroundColor: palette.forestDeep, borderColor: palette.forestDeep },
  tierBadge: { alignSelf: 'flex-start', backgroundColor: palette.emeraldDeep, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 4 },
  tierPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  tierPrice: { fontFamily: fontFamily.displayBold, fontSize: 44, lineHeight: 50 },
  tierDesc: { marginBottom: space.xs },
  tierDivider: { height: 1, backgroundColor: 'rgba(128,128,128,0.2)', marginVertical: space.xs },
  tierFeatureRow: { flexDirection: 'row', gap: space.xs, alignItems: 'flex-start' },
  tierCtaWrap: { marginTop: 'auto' as const, paddingTop: space.md },

  finalCta: { width: '100%', alignSelf: 'stretch', backgroundColor: palette.forestDeep, paddingHorizontal: space.lg, paddingVertical: 80, boxSizing: 'border-box', alignItems: 'center', gap: space.lg },
  footer: { width: '100%', maxWidth: 1280, paddingHorizontal: space.xl, paddingVertical: space.xl, boxSizing: 'border-box', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
});
