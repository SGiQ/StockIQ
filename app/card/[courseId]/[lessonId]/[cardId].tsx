import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { findCard, getCourse, getLesson } from '@/content/registry';
import type { KeyInsightCard } from '@/content/types';
import { CardRenderer } from '@/components/cards/CardRenderer';
import { KeyInsightPoster } from '@/components/cards/KeyInsightCardView';
import { initialStateFor } from '@/components/player/cardState';
import { PillButton, Screen, Text } from '@/components/primitives';
import { shareViewAsImage } from '@/services/share/shareCard';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';

/**
 * A single saved card, big, with share and unsave.
 *
 * Only the poster itself is inside the capture ref — the chrome around it
 * must not end up in the exported image.
 */
export default function CardDetail() {
  const { courseId, lessonId, cardId } = useLocalSearchParams<{
    courseId: string;
    lessonId: string;
    cardId: string;
  }>();
  const router = useRouter();

  const card = findCard(courseId, lessonId, cardId);
  const lesson = getLesson(courseId, lessonId);
  const course = getCourse(courseId);

  const posterRef = useRef<View>(null);
  const [status, setStatus] = useState<string | null>(null);

  const isSaved = useAppStore((s) => s.isCardSaved(courseId, lessonId, cardId));
  const toggleSaved = useAppStore((s) => s.toggleSavedCard);

  if (!card) {
    return (
      <Screen tone="warm">
        <View style={styles.centre}>
          <Text variant="h2">Card not found</Text>
          <PillButton label="Close" variant="dark" fullWidth={false} onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const share = async () => {
    const result = await shareViewAsImage(posterRef, `stockiq-${lessonId}-${cardId}`);
    setStatus(
      result === 'shared'
        ? null
        : result === 'unavailable'
          ? 'Sharing is not available on this device.'
          : 'Could not create the image.',
    );
  };

  return (
    <Screen tone="warm">
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.close}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M6 6l12 12M18 6L6 18" stroke={palette.ink} strokeWidth={2.4} strokeLinecap="round" />
          </Svg>
        </Pressable>
        <View style={styles.headerText}>
          <Text variant="label" color={palette.slate} uppercase numberOfLines={1}>
            {course?.title ?? ''}
          </Text>
          <Text variant="h3" color={palette.ink} numberOfLines={1}>
            {lesson?.title ?? ''}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {card.type === 'key_insight' ? (
          // collapsable={false} keeps the view backed by a real native view
          // so view-shot has something to capture on Android.
          <View ref={posterRef} collapsable={false} style={styles.posterWrap}>
            <KeyInsightPoster card={card as KeyInsightCard} />
          </View>
        ) : (
          <View style={styles.generic}>
            <CardRenderer
              card={card}
              state={initialStateFor(card)}
              onStateChange={() => {}}
              onAnswered={() => {}}
              onAdvance={() => {}}
            />
          </View>
        )}

        {status && (
          <Text variant="caption" color={palette.danger} align="center">
            {status}
          </Text>
        )}

        <View style={styles.actions}>
          {card.type === 'key_insight' && (
            <PillButton label="Share as image" variant="dark" onPress={share} />
          )}
          <PillButton
            label={isSaved ? 'Remove from saved' : 'Save this card'}
            variant="ghost"
            onPress={() => void toggleSaved(courseId, lessonId, cardId)}
          />
        </View>
      </ScrollView>
    </Screen>
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
  close: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: space.xxs,
  },
  body: {
    padding: space.lg,
    gap: space.lg,
  },
  posterWrap: {
    backgroundColor: palette.paperWarm,
  },
  generic: {
    minHeight: 420,
  },
  actions: {
    gap: space.sm,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
  },
});
