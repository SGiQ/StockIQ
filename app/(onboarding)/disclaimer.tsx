import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Glyph } from '@/components/art/Glyph';
import { PillButton, Screen, Text } from '@/components/primitives';
import { OnboardingProgress } from '@/components/OnboardingProgress';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

const TERMS = [
  'StockiQ teaches concepts. It does not tell you what to buy, sell, or hold.',
  'Nothing here is personalised advice. We do not know your situation, and we are not licensed to advise on it.',
  'Every company and price used in a lesson is hypothetical, chosen to make a concept clear.',
  'Investing puts your money at risk. You can lose some or all of it.',
];

/**
 * The acknowledgement gate.
 *
 * This is one of three places the not-advice notice appears — the others
 * being the footer of every screen that lists strategies and the ASK sheet.
 * One buried settings line would not be enough for a finance app, and the
 * acknowledgement is timestamped so there is a record of when it was shown.
 */
export default function Disclaimer() {
  const colors = useColors();
  const router = useRouter();
  const acknowledge = useAppStore((s) => s.acknowledgeDisclaimer);

  return (
    <Screen tone="forest">
      <View style={styles.content}>
        <OnboardingProgress step={4} total={4} />

        <View style={styles.header}>
          <View style={styles.badge}>
            <Glyph name="scale" size={30} color={palette.forestDeep} />
          </View>
          <Text variant="h1" color={colors.paper}>
            Before you start.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.terms} showsVerticalScrollIndicator={false}>
          {TERMS.map((term) => (
            <View key={term} style={styles.term}>
              <View style={styles.dot} />
              <Text variant="body" color={colors.paper} style={styles.termText}>
                {term}
              </Text>
            </View>
          ))}
        </ScrollView>

        <PillButton
          label="I understand"
          variant="light"
          onPress={async () => {
            await acknowledge();
            router.replace('/(tabs)');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: space.lg,
    paddingBottom: space.xl,
    gap: space.lg,
  },
  header: {
    gap: space.md,
    marginTop: space.lg,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: palette.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terms: {
    gap: space.lg,
    paddingVertical: space.sm,
  },
  term: {
    flexDirection: 'row',
    gap: space.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.mint,
    marginTop: 11,
  },
  termText: {
    flex: 1,
  },
});
