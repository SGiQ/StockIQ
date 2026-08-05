import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Glyph } from '@/components/art/Glyph';
import { PillButton, Text } from '@/components/primitives';
import { fontFamily, palette, radius, shadow, space } from '@/theme/tokens';

const FEATURES = [
  { icon: 'clock', title: 'Two-minute lessons', body: 'Build market fluency one focused idea at a time.' },
  { icon: 'chart-up', title: 'Ideas you can see', body: 'Paper-craft stories, real charts, and interactive explanations.' },
  { icon: 'brain', title: 'Practice that sticks', body: 'Quizzes, spoken feedback, streaks, and progress tracking.' },
] as const;

export default function LandingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  // Mobile browsers can report the layout viewport before reserving space for
  // their scrollbar/chrome. Leave one extra gutter so nothing is clipped at
  // the physical right edge on iPhone-sized web views.
  const compactSection = compact ? { width: Math.max(280, width - 72), paddingHorizontal: 0 } : null;
  // Bundle the hero locally rather than hardcoding the Vercel URL for native —
  // it then loads offline and doesn't couple a native build to the web deploy.
  const heroSource = require('../public/lesson-art/ownership.jpg');

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <View style={[styles.nav, compact && styles.navCompact, compactSection]}>
        <Image
          source={require('../public/logo/SG.png')}
          contentFit="contain"
          style={styles.brandMark}
          accessibilityLabel="StockIQ"
        />
        <Text variant="h2" color={palette.ink}>StockIQ</Text>
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

      <View style={[styles.hero, compact && styles.heroCompact, compactSection]}>
        <View style={styles.heroCopy}>
          <View style={styles.eyebrow}><Text variant="label" color={palette.forestDeep} uppercase>Learn investing visually</Text></View>
          <Text color={palette.ink} style={[styles.heroTitle, compact && styles.heroTitleCompact]}>
            Understand the market.{`\n`}Build your own judgment.
          </Text>
          <Text variant="body" color={palette.inkSoft} style={styles.heroBody}>
            Bite-sized lessons on stocks, business fundamentals, charts, risk, psychology, and proven investing strategies.
          </Text>
          <View style={[styles.actions, compact && styles.actionsCompact]}>
            {/* New users start with onboarding, not an email wall; returning
                users take the secondary path straight to sign-in. */}
            <PillButton label="Get started" onPress={() => router.push('/(onboarding)/welcome')} />
            <PillButton label="I already have an account" variant="ghost" onPress={() => router.push('/sign-in')} />
          </View>
          <Text variant="caption" color={palette.slate}>Educational content—not individualized financial advice.</Text>
        </View>

        <View style={styles.artShell}>
          <Image source={heroSource} style={styles.heroArt} contentFit="cover" transition={250} />
          <View style={styles.artCaption}>
            <Text variant="label" color={palette.mintSoft} uppercase>Lesson 1</Text>
            <Text variant="h2" color={palette.paper}>A stock is ownership.</Text>
          </View>
        </View>
      </View>

      <View style={[styles.featuresSection, compactSection, compact && styles.roundedSection]}>
        <Text variant="label" color={palette.forestDeep} uppercase align="center">A smarter way to learn</Text>
        <Text variant="h1" color={palette.ink} align="center">From curious beginner to confident thinker.</Text>
        <View style={[styles.featureGrid, compact && styles.featureGridCompact]}>
          {FEATURES.map((feature) => (
            <View key={feature.title} style={styles.featureCard}>
              <View style={styles.featureIcon}><Glyph name={feature.icon} size={24} color={palette.forestDeep} /></View>
              <Text variant="h3" color={palette.ink}>{feature.title}</Text>
              <Text variant="bodySm" color={palette.inkSoft}>{feature.body}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.finalCta, compactSection, compact && styles.roundedSection]}>
        <Text variant="h1" color={palette.paper} align="center">Make the market make sense.</Text>
        <Text variant="body" color={palette.mintSoft} align="center">Five learning paths. Thirty-seven lessons. Your pace.</Text>
        <PillButton label="Begin with Market Foundations" variant="light" fullWidth={false} onPress={() => router.push('/(onboarding)/welcome')} />
      </View>

      <View style={[styles.footer, compactSection]}>
        <Text variant="h3" color={palette.ink}>StockIQ</Text>
        <Text variant="caption" color={palette.slate}>Learn clearly. Invest thoughtfully.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F4F0E8', overflow: 'hidden' },
  pageContent: { alignItems: 'center' },
  nav: { width: '100%', maxWidth: 1180, minHeight: 82, paddingHorizontal: space.lg, boxSizing: 'border-box', flexDirection: 'row', alignItems: 'center', gap: space.sm },
  navCompact: { alignSelf: 'center' },
  brandMark: { width: 40, height: 40, borderRadius: 10 },
  navSpacer: { flex: 1 },
  navButton: { minHeight: 44, paddingVertical: space.sm, paddingHorizontal: space.lg },
  hero: { width: '100%', maxWidth: 1180, paddingHorizontal: space.lg, paddingTop: 56, paddingBottom: 88, boxSizing: 'border-box', flexDirection: 'row', alignItems: 'center', gap: 72 },
  heroCompact: { alignSelf: 'center', flexDirection: 'column', paddingTop: space.xl, paddingBottom: 56, gap: space.xl },
  heroCopy: { flex: 1, gap: space.lg },
  eyebrow: { alignSelf: 'flex-start', backgroundColor: '#DCEBDD', borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.sm },
  heroTitle: { fontFamily: fontFamily.displayBold, fontSize: 56, lineHeight: 62, letterSpacing: -1.4 },
  heroTitleCompact: { fontSize: 40, lineHeight: 47, letterSpacing: -0.8 },
  heroBody: { maxWidth: 570 },
  actions: { maxWidth: 420, gap: space.sm },
  actionsCompact: { maxWidth: undefined, width: '100%' },
  artShell: { flex: 0.82, minWidth: 0, width: '100%', maxWidth: 470, aspectRatio: 0.82, borderRadius: 36, overflow: 'hidden', backgroundColor: palette.forestDeep, ...shadow.floating },
  heroArt: { width: '100%', height: '76%' },
  artCaption: { flex: 1, backgroundColor: palette.forestDeep, padding: space.lg, justifyContent: 'center', gap: space.xs },
  featuresSection: { width: '100%', backgroundColor: palette.paper, paddingHorizontal: space.lg, paddingVertical: 88, boxSizing: 'border-box', alignItems: 'center', gap: space.md },
  featureGrid: { width: '100%', maxWidth: 1100, flexDirection: 'row', gap: space.lg, marginTop: space.xl },
  featureGridCompact: { flexDirection: 'column' },
  featureCard: { flex: 1, backgroundColor: palette.paperWarm, borderRadius: radius.lg, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: palette.hairline },
  featureIcon: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: '#DCEBDD', alignItems: 'center', justifyContent: 'center' },
  finalCta: { width: '100%', backgroundColor: palette.forestDeep, paddingHorizontal: space.lg, paddingVertical: 80, boxSizing: 'border-box', alignItems: 'center', gap: space.lg },
  footer: { width: '100%', maxWidth: 1180, paddingHorizontal: space.lg, paddingVertical: space.xl, boxSizing: 'border-box', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  roundedSection: { borderRadius: radius.lg, marginBottom: space.lg },
});
