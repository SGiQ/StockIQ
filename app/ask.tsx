import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { CardSurface, PillButton, Screen, Text } from '@/components/primitives';
import { UnlimitedUpsellSheet } from '@/components/player/UnlimitedUpsellSheet';
import { AskError, askService, type AskContext } from '@/services/ask';
import { ASK_FREE_DAILY, asksRemaining, buildContextualQuestion, type AskTurn } from '@/features/advisor';
import { useAppStore, useEntitlement } from '@/store/slices/useAppStore';
import { toDayISO } from '@/lib/dates';
import type { Card } from '@/content/types';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

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
  const colors = useColors();
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const history = useAppStore((s) => s.askThreads);
  const recordAsk = useAppStore((s) => s.recordAsk);
  const entitlement = useEntitlement();

  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<AskError | null>(null);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const scroll = useRef<ScrollView | null>(null);

  const today = toDayISO();
  const unlimited = entitlement.unlimitedAsk;
  const remaining = asksRemaining(profile, today, unlimited);
  const outOfAsks = !unlimited && remaining <= 0;
  const streaming = pending !== null;
  const active = turns.length > 0 || streaming;

  // Follow the answer as it streams and as turns land.
  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: true });
  }, [answer, turns.length]);

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

      const priorTurns = turns;
      setDraft('');
      setPending(q);
      setAnswer('');
      setError(null);
      let full = '';
      try {
        full = await askService.ask(
          buildContextualQuestion(priorTurns, q),
          GENERAL_CONTEXT,
          (delta) => setAnswer((prev) => prev + delta),
          next.signal,
        );
      } catch (e) {
        setError(e instanceof AskError ? e : new AskError('unknown', 'Something went wrong.'));
        setPending(null);
        setAnswer('');
        return;
      }
      setPending(null);
      setAnswer('');
      if (full.trim()) {
        setTurns((prev) => [...prev, { question: q, answer: full }]);
        await recordAsk(q, full);
      }
    },
    [outOfAsks, recordAsk, streaming, turns],
  );

  const reset = useCallback(() => {
    controller.current?.abort();
    setTurns([]);
    setPending(null);
    setAnswer('');
    setError(null);
  }, []);

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
            <Path d="M15 5l-7 7 7 7" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
        <Text variant="h2">
          Ask StockIQ
        </Text>
        <View style={styles.headerRight}>
          {active ? (
            <Pressable onPress={reset} hitSlop={8} accessibilityRole="button" accessibilityLabel="New conversation">
              <Text variant="label" color={palette.violetInk} uppercase>
                New
              </Text>
            </Pressable>
          ) : null}
          <View style={styles.quota}>
            <Text variant="label" color={palette.violetInk} uppercase>
              {unlimited ? 'Unlimited' : `${remaining}/${ASK_FREE_DAILY}`}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!active ? (
          <Text variant="body" color={colors.slate}>
            Ask anything about investing or markets — concepts, terms, how to read a number. Ask follow-ups and it remembers the thread. Educational only, never a buy or sell call.
          </Text>
        ) : null}

        {turns.map((t, i) => (
          <View key={i} style={styles.turn}>
            <View style={styles.qBubble}>
              <Text variant="bodyEm">
                {t.question}
              </Text>
            </View>
            <Text variant="body">
              {t.answer}
            </Text>
          </View>
        ))}

        {streaming ? (
          <View style={styles.turn}>
            <View style={styles.qBubble}>
              <Text variant="bodyEm">
                {pending}
              </Text>
            </View>
            <Text variant="body">
              {answer || 'Thinking…'}
            </Text>
          </View>
        ) : null}

        {error ? (
          <Text variant="caption" color={palette.danger}>
            {error.message}
          </Text>
        ) : null}

        {!active && outOfAsks ? (
          <CardSurface style={styles.capCard}>
            <Text variant="h3">
              You're out of questions today
            </Text>
            <Text variant="caption" color={colors.slate}>
              {`Free includes ${ASK_FREE_DAILY} a day. They reset tomorrow — or go unlimited with Pro.`}
            </Text>
            <PillButton label="Go Unlimited" variant="primary" onPress={() => setUpsellOpen(true)} />
          </CardSurface>
        ) : null}

        {!active && !outOfAsks ? (
          <View style={styles.suggestions}>
            <Text variant="label" color={colors.slate} uppercase>
              Try asking
            </Text>
            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => void submit(s)}
                accessibilityRole="button"
                accessibilityLabel={s}
                style={({ pressed }) => [styles.suggestion, { backgroundColor: colors.paper, borderColor: colors.hairline }, pressed && styles.pressed]}
              >
                <Text variant="bodySm">
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!active && history.length > 0 ? (
          <View style={styles.historyWrap}>
            <Text variant="label" color={colors.slate} uppercase>
              Recent — tap to continue
            </Text>
            {history.slice(0, 8).map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setTurns([{ question: t.question, answer: t.answer }])}
                accessibilityRole="button"
                accessibilityLabel={`Continue: ${t.question}`}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <CardSurface style={styles.historyCard}>
                  <Text variant="bodyEm">
                    {t.question}
                  </Text>
                  <Text variant="caption" color={colors.slate} numberOfLines={2}>
                    {t.answer}
                  </Text>
                </CardSurface>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.inputBar, { borderTopColor: colors.hairline, backgroundColor: colors.paperWarm }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={outOfAsks ? 'Out of questions today' : active ? 'Ask a follow-up…' : 'Ask anything…'}
          placeholderTextColor={colors.slateLight}
          editable={!outOfAsks && !streaming}
          onSubmitEditing={() => void submit(draft)}
          returnKeyType="send"
          style={[styles.input, { backgroundColor: colors.paper, color: colors.ink }]}
        />
        <Pressable
          onPress={() => void submit(draft)}
          disabled={streaming || !draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={[styles.send, (streaming || !draft.trim()) && { backgroundColor: colors.slateLight }]}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path d="M4 12l16-8-6 8 6 8z" fill={colors.paper} />
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
  headerRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: space.md },
  quota: {
    backgroundColor: palette.violetSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs + 1,
  },
  body: { padding: space.lg, gap: space.md, paddingBottom: space.lg },
  turn: { gap: space.sm },
  qBubble: {
    alignSelf: 'flex-end',
    maxWidth: '88%',
    backgroundColor: palette.violetSoft,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  capCard: { gap: space.sm },
  suggestions: { gap: space.sm },
  suggestion: {
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
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
  },
  input: {
    flex: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
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
  sendDisabled: {},
});
