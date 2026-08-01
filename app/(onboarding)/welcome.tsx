import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Glyph } from '@/components/art/Glyph';
import { PillButton, Screen, Text } from '@/components/primitives';
import { palette, radius, space } from '@/theme/tokens';

const PROMISES = [
  { glyph: 'clock', text: 'Finish a chapter in two minutes' },
  { glyph: 'chart-up', text: 'Every idea drawn as a real chart' },
  { glyph: 'brain', text: 'Quizzes that make it stick' },
] as const;

export default function Welcome() {
  const router = useRouter();

  return (
    <Screen tone="forest">
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text variant="display" color={palette.paper}>
            Learn the market.
          </Text>
          <Text variant="h1" color={palette.mintSoft}>
            Two minutes at a time.
          </Text>
        </View>

        <View style={styles.promises}>
          {PROMISES.map((promise) => (
            <View key={promise.text} style={styles.promise}>
              <View style={styles.promiseIcon}>
                <Glyph name={promise.glyph} size={22} color={palette.forestDeep} />
              </View>
              <Text variant="body" color={palette.paper} style={styles.promiseText}>
                {promise.text}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <PillButton
            label="I'm new — get started"
            variant="light"
            onPress={() => router.push('/(onboarding)/choose-course')}
          />
          <PillButton
            label="Sign in to continue"
            variant="dark"
            onPress={() => router.push('/sign-in')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: space.lg,
    justifyContent: 'space-between',
    paddingBottom: space.xl,
    gap: space.md,
  },
  hero: {
    marginTop: space.xxl,
    gap: space.sm,
  },
  promises: {
    gap: space.lg,
  },
  promise: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  promiseIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.mintSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseText: {
    flex: 1,
  },
  actions: {
    gap: space.sm,
  },
});
