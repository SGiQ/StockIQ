import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { CardSurface, PillButton, Screen, SpeakerIcon, Text } from '@/components/primitives';
import { narrationUrlFor } from '@/services/narration/speech';
import { useNarration } from '@/services/narration/useNarration';
import { useAppStore } from '@/store/slices/useAppStore';
import type { UserProfile } from '@/store/repository';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

export default function NarrationSettings() {
  const router = useRouter();
  const colors = useColors();
  const enabled = useAppStore((s) => s.profile?.narrationEnabled ?? false);
  const voice = useAppStore((s) => s.profile?.narrationVoice ?? 'female');
  const speed = useAppStore((s) => s.profile?.narrationSpeed ?? 1);
  const setEnabled = useAppStore((s) => s.setNarrationEnabled);
  const setVoice = useAppStore((s) => s.setNarrationVoice);
  const setSpeed = useAppStore((s) => s.setNarrationSpeed);
  const maleVoiceVote = useAppStore((s) => s.profile?.maleVoiceVote ?? null);
  const setMaleVoiceVote = useAppStore((s) => s.setMaleVoiceVote);
  const previewSource = narrationUrlFor(
    'lesson:market-foundations/bid-ask-and-spread',
    'c1',
    voice,
  );
  const preview = useNarration(previewSource, false, speed);
  const [auditionVoice, setAuditionVoice] = useState<AuditionVoice>('cedar');
  const audition = useNarration(
    Platform.OS === 'web' ? `/voice-previews/${auditionVoice}.mp3` : null,
    false,
    speed,
  );

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
              stroke={colors.ink}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Pressable>
        <Text variant="h3">
          Narration
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <SpeakerIcon
              size={30}
              color={colors.paper}
              muted={!enabled}
            />
          </View>
          <Text variant="h2">
            Listen as you learn.
          </Text>
          <Text variant="body" color={colors.slate}>
            StockIQ can read each card as it appears. Quiz choices stay silent;
            after you submit an answer, the result and explanation are spoken.
          </Text>
        </View>

        <CardSurface style={styles.section}>
          <View style={styles.sectionHeading}>
            <View style={styles.sectionText}>
              <Text variant="h3">
                Autoplay narration
              </Text>
              <Text variant="caption" color={colors.slate}>
                Start reading each new card automatically.
              </Text>
            </View>
            <Pressable
              onPress={() => void setEnabled(!enabled)}
              accessibilityRole="switch"
              accessibilityState={{ checked: enabled }}
              accessibilityLabel="Autoplay narration"
              style={[styles.switchTrack, { backgroundColor: colors.hairline }, enabled && styles.switchTrackOn]}
            >
              <View style={[styles.switchThumb, { backgroundColor: colors.paper }, enabled && styles.switchThumbOn]} />
            </Pressable>
          </View>
        </CardSurface>

        <View style={styles.voiceSection}>
          <Text variant="label" color={colors.slate} uppercase>
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

        {/* Internal voice-selection survey. The sample clips only exist on the
            web preview, so this is web-only — on native the play button would
            be permanently disabled and the whole section reads as broken. */}
        {Platform.OS === 'web' ? (
        <CardSurface style={styles.auditionSection}>
          <View style={styles.sectionText}>
            <Text variant="label" color={colors.slate} uppercase>
              Help choose the new male voice
            </Text>
            <Text variant="bodySm" color={colors.inkSoft}>
              Try three replacements for the current narrator. These samples do not change your saved voice.
            </Text>
          </View>
          <View style={styles.auditionChoices} accessibilityRole="radiogroup">
            {AUDITION_VOICES.map((candidate) => (
              <Pressable
                key={candidate.id}
                onPress={() => {
                  audition.stop();
                  setAuditionVoice(candidate.id);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: auditionVoice === candidate.id }}
                accessibilityLabel={`${candidate.label} voice sample`}
                style={[
                  styles.auditionChoice,
                  { borderColor: colors.hairline },
                  auditionVoice === candidate.id && styles.auditionChoiceSelected,
                ]}
              >
                <Text variant="label">{candidate.label}</Text>
                <Text variant="caption" color={colors.slate}>{candidate.note}</Text>
              </Pressable>
            ))}
          </View>
          <PillButton
            label={audition.playing ? 'Stop audition' : `Play ${auditionVoice} sample`}
            variant="ghost"
            onPress={audition.playing ? audition.stop : audition.play}
            disabled={!audition.available}
          />
          <PillButton
            label={maleVoiceVote === auditionVoice ? `Voted for ${auditionVoice}` : `Vote for ${auditionVoice}`}
            variant={maleVoiceVote === auditionVoice ? 'light' : 'dark'}
            onPress={() => void setMaleVoiceVote(auditionVoice)}
            disabled={maleVoiceVote === auditionVoice}
          />
        </CardSurface>
        ) : null}

        <View style={styles.voiceSection}>
          <Text variant="label" color={colors.slate} uppercase>
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
          <Text variant="caption" color={colors.slate}>
            Applies to previews and every narrated lesson card.
          </Text>
        </View>

        <View style={[styles.note, { backgroundColor: colors.paper }]}>
          <Text variant="label" color={colors.slate} uppercase>
            How it works
          </Text>
          <Text variant="bodySm" color={colors.inkSoft}>
            Every clip is generated before release. Your device never sends
            lesson text—or an API key—to a speech service while you learn.
          </Text>
          <Text variant="bodySm" color={colors.inkSoft}>
            The narration voices are AI-generated, not recordings of human
            narrators.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

type AuditionVoice = 'cedar' | 'ash' | 'echo';

const AUDITION_VOICES: { id: AuditionVoice; label: string; note: string }[] = [
  { id: 'cedar', label: 'Cedar', note: 'Warm and polished' },
  { id: 'ash', label: 'Ash', note: 'Clear and conversational' },
  { id: 'echo', label: 'Echo', note: 'Steady and understated' },
];

function SpeedChoice({
  value,
  selected,
  onPress,
}: {
  value: UserProfile['narrationSpeed'];
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${value} times speed`}
      style={[styles.speedChoice, { borderColor: colors.hairline, backgroundColor: colors.paper }, selected && styles.speedChoiceSelected]}
    >
      <Text variant="label" color={selected ? palette.forestDeep : colors.ink}>
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
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} narrator`}
      style={[styles.voiceChoice, { backgroundColor: colors.paper }, selected && styles.voiceChoiceSelected]}
    >
      <View style={[styles.radio, { borderColor: colors.slateLight }, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <Text variant="body">
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
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  voiceSection: {
    gap: space.sm,
  },
  auditionSection: {
    gap: space.md,
  },
  auditionChoices: {
    gap: space.sm,
  },
  auditionChoice: {
    minHeight: 66,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    justifyContent: 'center',
    gap: space.xxs,
  },
  auditionChoiceSelected: {
    borderColor: palette.emeraldDeep,
    backgroundColor: palette.mintSoft,
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
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
});
