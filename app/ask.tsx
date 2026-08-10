import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { CardSurface, PillButton, Screen, Text } from '@/components/primitives';
import { UnlimitedUpsellSheet } from '@/components/player/UnlimitedUpsellSheet';
import { AskError, askService, type AskContext } from '@/services/ask';
import { ASK_FREE_DAILY, asksRemaining } from '@/features/advisor';
import { useAppStore, useEntitlement } from '@/store/slices/useAppStore';
import { toDayISO } from '@/lib/dates';
import type { Card } from '@/content/types';
import { palette, radius, space } from '@/theme/tokens';

/** A minimal general context so the shared ASK proxy answers a free-form question. */
const GENERAL_CONTEXT: AskContext = {
  card: {
    id: 'ask',
    type: 'concept',
    headline: 'Open question',
    body: 'A free-form question from the learner about investing and markets.',
  } as Card,
  lessonTitle: 'Ask StockIQ',
  courseTitle: 'Ask',
};

const SUGGESTIONS = [
  "What's the difference between a stock and a bond?",
  'How should a beginner think about risk?',
  'Explain the P/E ratio simply.',
  "What does 'priced in' mean?",
];

export default function AskScreen() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const history = useAppStore((s) => s.askThreads);
  const recordAsk = useAppStore((s) => s.recordAsk);
  const entitlement = useEntitlement();

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<AskError | null>(null);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);

  const today = toDayISO();
  const unlimited = entitlement.unlimitedAsk;
  const remaining = asksRemaining(profile, today, unlimited);
  const outOfAsks = !unlimited && remaining <= 0;

  const submit = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q || streaming) return;
      if (outOfAsks) {
        setUpsellOpen(true);
        return;
      }
      controller.current?.abort();
      const next = new AbortController();
      controller.current = next;

      setQuestion(q);
      setAnswer('');
      setError(null);
      setStreaming(true);
      let full = '';
      try {
        full = await askService.ask(
          q,
          GENERAL_CONTEXT,
          (delta) => setAnswer((prev) => prev + delta),
          next.signal,
        );
      } catch (e) {
        setError(e instanceof AskError ? e : new AskError('unknown', 'Something went wrong.'));
        setStreaming(false);
        return;
      }
      setStreaming(false);
      if (full.trim()) await recordAsk(q, full);
    },
    [outOfAsks, recordAsk, streaming],
  );

  return (
    <Screen tone="warm" edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M15 5l-7 7 7 7" stroke={palette.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
        <Text variant="h2" color={palette.ink}>
          Ask StockIQ
        </Text>
        <View style={styles.quota}>
          <Text variant="label" color={palette.violetInk} uppercase>
            {unlimited ? 'Unlimited' : `${remaining}/${ASK_FREE_DAILY}`}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text variant="body" color={palette.slate}>
          Ask anything about investing or markets — concepts, terms, how to read a number. Educational only, never a buy or sell call.
        </Text>

        {answer || streaming ? (
          <CardSurface style={styles.answerCard}>
            <Text variant="label" color={palette.slateLight} uppercase>
              {question}
            </Text>
            <Text variant="body" color={palette.ink}>
              {answer || 'Thinking…'}
            </Text>
          </CardSurface>
        ) : null}

        {error ? (
          <Text variant="caption" color={palette.danger}>
            {error.message}
          </Text>
        ) : null}

        {outOfAsks ? (
          <CardSurface style={styles.capCard}>
            <Text variant="h3" color={palette.ink}>
              You're out of questions today
            </Text>
            <Text variant="caption" color={palette.slate}>
              {`Free includes ${ASK_FREE_DAILY} a day. They reset tomorrow — or go unlimited with Pro.`}
            </Text>
            <PillButton label="Go Unlimited" variant="primary" onPress={() => setUpsellOpen(true)} />
          </CardSurface>
        ) : (
          <View style={styles.suggestions}>
            <Text variant="label" color={palette.slate} uppercase>
              Try asking
            </Text>
            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => void submit(s)}
                disabled={streaming}
                accessibilityRole="button"
                accessibilityLabel={s}
                style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
              >
                <Text variant="bodySm" color={palette.ink}>
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {history.length > 0 ? (
          <View style={styles.historyWrap}>
            <Text variant="label" color={palette.slate} uppercase>
              Recent
            </Text>
            {history.slice(0, 8).map((t) => (
              <CardSurface key={t.id} style={styles.historyCard}>
                <Text variant="bodyEm" color={palette.ink}>
                  {t.question}
                </Text>
                <Text variant="caption" color={palette.slate} numberOfLines={3}>
                  {t.answer}
                </Text>
              </CardSurface>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder={outOfAsks ? 'Out of questions today' : 'Ask anything…'}
          placeholderTextColor={palette.slateLight}
          editable={!outOfAsks && !streaming}
          onSubmitEditing={() => void submit(question)}
          returnKeyType="send"
          style={styles.input}
        />
        <Pressable
          onPress={() => void submit(question)}
          disabled={streaming || !question.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={[styles.send, (streaming || !question.trim()) && styles.sendDisabled]}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path d="M4 12l16-8-6 8 6 8z" fill={palette.paper} />
          </Svg>
        </Pressable>
      </View>

      <UnlimitedUpsellSheet visible={upsellOpen} onClose={() => setUpsellOpen(false)} />
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
  quota: {
    marginLeft: 'auto',
    backgroundColor: palette.violetSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs + 1,
  },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.lg },
  answerCard: { gap: space.sm },
  capCard: { gap: space.sm },
  suggestions: { gap: space.sm },
  suggestion: {
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  pressed: { opacity: 0.6 },
  historyWrap: { gap: space.sm, marginTop: space.sm },
  historyCard: { gap: space.xxs },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    backgroundColor: palette.paperWarm,
  },
  input: {
    flex: 1,
    backgroundColor: palette.paper,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    color: palette.ink,
    fontSize: 16,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: palette.slateLight },
});
