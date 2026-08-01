import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { CardSurface, PillButton, Screen, SpeakerIcon, Text } from '@/components/primitives';
import { narrationUrlFor } from '@/services/narration/speech';
import { useNarration } from '@/services/narration/useNarration';
import { useAppStore } from '@/store/slices/useAppStore';
import type { UserProfile } from '@/store/repository';
import { palette, radius, space } from '@/theme/tokens';

export default function NarrationSettings() {
  const router = useRouter();
  const enabled = useAppStore((s) => s.profile?.narrationEnabled ?? false);
  const voice = useAppStore((s) => s.profile?.narrationVoice ?? 'female');
  const speed = useAppStore((s) => s.profile?.narrationSpeed ?? 1);
  const setEnabled = useAppStore((s) => s.setNarrationEnabled);
  const setVoice = useAppStore((s) => s.setNarrationVoice);
  const setSpeed = useAppStore((s) => s.setNarrationSpeed);
  const previewSource = narrationUrlFor(
    'lesson:market-foundations/bid-ask-and-spread',
    'c1',
    voice,
  );
  const preview = useNarration(previewSource, false, speed);

  return (
    <Screen tone="warm">
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/(tabs)')
          }
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M15 5l-7 7 7 7"
              stroke={palette.ink}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Pressable>
        <Text variant="h3" color={palette.ink}>
          Narration
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <SpeakerIcon
              size={30}
              color={palette.paper}
              muted={!enabled}
            />
          </View>
          <Text variant="h2" color={palette.ink}>
            Listen as you learn.
          </Text>
          <Text variant="body" color={palette.slate}>
            StockIQ can read each card as it appears. Questions are spoken,
            but answer choices and explanations stay silent so quizzes are
            never spoiled.
          </Text>
        </View>

        <CardSurface style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionText}>
              <Text variant="h3" color={palette.ink}>
                Autoplay narration
              </Text>
              <Text variant="caption" color={palette.slate}>
                Start reading each new card automatically.
              </Text>
            </View>
            <Pressable
              onPress={() => void setEnabled(!enabled)}
              accessibilityRole="switch"
              accessibilityState={{ checked: enabled }}
              accessibilityLabel="Autoplay narration"
              style={[styles.switchTrack, enabled && styles.switchTrackOn]}
            >
              <View style={[styles.switchThumb, enabled && styles.switchThumbOn]} />
            </Pressable>
          </View>
        </CardSurface>

        <View style={styles.voiceSection}>
          <Text variant="label" color={palette.slate} uppercase>
            Voice
          </Text>
          <View style={styles.voiceChoices}>
            <VoiceChoice
              label="Female"
              selected={voice === 'female'}
              onPress={() => void setVoice('female')}
            />
            <VoiceChoice
              label="Male"
              selected={voice === 'male'}
              onPress={() => void setVoice('male')}
            />
          </View>
          <PillButton
            label={preview.playing ? 'Stop preview' : `Preview ${voice} voice`}
            variant="ghost"
            onPress={preview.playing ? preview.stop : preview.play}
            disabled={!preview.available}
          />
        </View>

        <View style={styles.voiceSection}>
          <Text variant="label" color={palette.slate} uppercase>
            Playback speed
          </Text>
          <View style={styles.speedChoices} accessibilityRole="radiogroup">
            {([0.75, 1, 1.25, 1.5] as const).map((value) => (
              <SpeedChoice
                key={value}
                value={value}
                selected={speed === value}
                onPress={() => void setSpeed(value)}
              />
            ))}
          </View>
          <Text variant="caption" color={palette.slate}>
            Applies to previews and every narrated lesson card.
          </Text>
        </View>

        <View style={styles.note}>
          <Text variant="label" color={palette.slate} uppercase>
            How it works
          </Text>
          <Text variant="bodySm" color={palette.inkSoft}>
            Every clip is generated before release. Your device never sends
            lesson text—or an API key—to a speech service while you learn.
          </Text>
          <Text variant="bodySm" color={palette.inkSoft}>
            The narration voices are AI-generated, not recordings of human
            narrators.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function SpeedChoice({
  value,
  selected,
  onPress,
}: {
  value: UserProfile['narrationSpeed'];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${value} times speed`}
      style={[styles.speedChoice, selected && styles.speedChoiceSelected]}
    >
      <Text variant="label" color={selected ? palette.forestDeep : palette.ink}>
        {`${value}×`}
      </Text>
    </Pressable>
  );
}

function VoiceChoice({
  label,
  selected,
  onPress,
}: {
  label: 'Female' | 'Male';
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} narrator`}
      style={[styles.voiceChoice, selected && styles.voiceChoiceSelected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <Text variant="body" color={palette.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  body: {
    padding: space.lg,
    gap: space.xl,
    paddingBottom: space.xxl,
  },
  hero: {
    gap: space.sm,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: palette.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  section: {
    gap: space.md,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  sectionText: {
    flex: 1,
    gap: space.xxs,
  },
  switchTrack: {
    width: 52,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: palette.hairline,
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: palette.emerald,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: palette.paper,
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  voiceSection: {
    gap: space.sm,
  },
  voiceChoices: {
    gap: space.sm,
  },
  speedChoices: {
    flexDirection: 'row',
    gap: space.sm,
  },
  speedChoice: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedChoiceSelected: {
    borderColor: palette.emeraldDeep,
    backgroundColor: palette.mintSoft,
  },
  voiceChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: space.md,
  },
  voiceChoiceSelected: {
    borderColor: palette.emerald,
    backgroundColor: palette.mintSoft,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: palette.slateLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: palette.emerald,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: palette.emerald,
  },
  note: {
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
});
