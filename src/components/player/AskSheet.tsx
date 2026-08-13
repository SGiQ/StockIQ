import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { Card } from '@/content/types';
import { Chip, PillButton, Text } from '@/components/primitives';
import { AskError, SUGGESTED_QUESTIONS, askService } from '@/services/ask';
import * as haptics from '@/lib/haptics';
import { palette, radius, shadow, space, type as typeScale } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

export interface AskSheetProps {
  visible: boolean;
  onClose: () => void;
  card: Card;
  lessonTitle: string;
  courseTitle: string;
}

/**
 * The ASK sheet.
 *
 * The answer streams in, and the request is aborted on dismiss — a learner who
 * closes the sheet should not keep paying for tokens they will never read.
 */
export function AskSheet({ visible, onClose, card, lessonTitle, courseTitle }: AskSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<AskError | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [keyDraft, setKeyDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!visible) return;
    void askService.isConfigured().then(setConfigured);
  }, [visible]);

  const abort = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setStreaming(false);
  }, []);

  // Abort on unmount as well as on dismiss — a backgrounded modal that keeps
  // a stream open is the same wasted spend.
  useEffect(() => () => controller.current?.abort(), []);

  const dismiss = useCallback(() => {
    abort();
    setQuestion('');
    setAnswer('');
    setError(null);
    onClose();
  }, [abort, onClose]);

  /**
   * Saving the key happens inside the sheet rather than on the settings
   * screen.
   *
   * Partly UX — a learner who taps ASK mid-lesson wants to ask their
   * question, not lose their place to a settings detour. And partly
   * correctness: navigating away freezes the screen that owns this modal's
   * `visible` flag, so the close never commits and the sheet ends up pinned
   * over the destination. Not leaving is the fix that has no timing in it.
   */
  const saveKey = useCallback(async () => {
    const trimmed = keyDraft.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await askService.saveKey(trimmed);
      setKeyDraft('');
      setConfigured(await askService.isConfigured());
    } catch {
      setError(new AskError('unknown', 'Could not save the key on this device.'));
    } finally {
      setSaving(false);
    }
  }, [keyDraft]);

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      abort();
      const next = new AbortController();
      controller.current = next;

      setQuestion(trimmed);
      setAnswer('');
      setError(null);
      setStreaming(true);
      haptics.tap();

      try {
        await askService.ask(
          trimmed,
          { card, lessonTitle, courseTitle },
          (delta) => setAnswer((prev) => prev + delta),
          next.signal,
        );
      } catch (e) {
        // An abort is the learner closing the sheet, not a failure.
        if (!next.signal.aborted) {
          setError(e instanceof AskError ? e : new AskError('unknown', 'Something went wrong.'));
        }
      } finally {
        if (controller.current === next) controller.current = null;
        setStreaming(false);
      }
    },
    [abort, card, courseTitle, lessonTitle, streaming],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={dismiss}>
      <Pressable style={styles.scrim} onPress={dismiss} accessibilityLabel="Close" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md, backgroundColor: colors.paperWarm }]}>
          <View style={[styles.grabber, { backgroundColor: colors.hairline }]} />

          <View style={styles.head}>
            <View style={styles.badge}>
              <Sparkle />
            </View>
            <Text variant="h3" style={styles.headText}>
              Ask about this card
            </Text>
            <Pressable onPress={dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d="M6 6l12 12M18 6L6 18" stroke={colors.slate} strokeWidth={2.4} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>

          {configured === false ? (
            <SetUpInline
              value={keyDraft}
              onChange={setKeyDraft}
              onSave={() => void saveKey()}
              saving={saving}
            />
          ) : (
            <>
              <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                {question.length > 0 && (
                  <Text variant="bodyEm">
                    {question}
                  </Text>
                )}

                {answer.length > 0 && (
                  <Text variant="body" color={colors.inkSoft}>
                    {answer}
                  </Text>
                )}

                {streaming && answer.length === 0 && (
                  <View style={styles.thinking}>
                    <ActivityIndicator color={colors.slate} />
                    <Text variant="caption" color={colors.slate}>
                      Thinking…
                    </Text>
                  </View>
                )}

                {error && (
                  <View style={styles.error}>
                    <Text variant="bodySm" color={palette.danger}>
                      {error.message}
                    </Text>
                    {(error.reason === 'bad_key' || error.reason === 'not_configured') && (
                      <Pressable onPress={() => setConfigured(false)}>
                        <Text variant="bodySm" color={palette.azure}>
                          Enter a different key →
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {question.length === 0 && !streaming && (
                  <View style={styles.suggestions}>
                    {SUGGESTED_QUESTIONS.map((suggestion) => (
                      <Chip key={suggestion} label={suggestion} onPress={() => void submit(suggestion)} />
                    ))}
                  </View>
                )}
              </ScrollView>

              <View style={styles.composer}>
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="Ask anything about this card"
                  placeholderTextColor={colors.slateLight}
                  style={[styles.input, { color: colors.ink, backgroundColor: colors.paper, borderColor: colors.hairline }]}
                  multiline
                  accessibilityLabel="Your question"
                  onSubmitEditing={() => void submit(question)}
                />
                {streaming ? (
                  <PillButton label="Stop" variant="ghost" onPress={abort} />
                ) : (
                  <PillButton
                    label="Ask"
                    variant="dark"
                    disabled={question.trim().length === 0}
                    onPress={() => void submit(question)}
                  />
                )}
              </View>
            </>
          )}

          {/*
            One of the three places the not-advice notice appears, alongside
            onboarding and every strategy page.
          */}
          <Text variant="caption" color={colors.slateLight} align="center">
            Educational only — not financial advice.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SetUpInline({
  value,
  onChange,
  onSave,
  saving,
}: {
  value: string;
  onChange: (next: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <Text variant="body" color={colors.inkSoft}>
        ASK runs on your own Anthropic API key. It is stored in this
        device&apos;s keychain and sent only to api.anthropic.com.
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="sk-ant-…"
        placeholderTextColor={colors.slateLight}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={[styles.input, { color: colors.ink, backgroundColor: colors.paper, borderColor: colors.hairline }]}
        accessibilityLabel="Anthropic API key"
      />
      <PillButton
        label={saving ? 'Saving…' : 'Save key and continue'}
        variant="dark"
        disabled={saving || value.trim().length === 0}
        onPress={onSave}
      />
    </View>
  );
}

/** The four-point sparkle on the ASK button. */
export function Sparkle({ size = 20, color = palette.paper }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.5c.9 4.6 2.4 6.1 7 7-4.6.9-6.1 2.4-7 7-.9-4.6-2.4-6.1-7-7 4.6-.9 6.1-2.4 7-7z"
        fill={color}
      />
      <Path d="M18.5 15.5c.4 2 1 2.6 3 3-2 .4-2.6 1-3 3-.4-2-1-2.6-3-3 2-.4 2.6-1 3-3z" fill={color} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.md,
    maxHeight: '85%',
    ...shadow.floating,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  headText: {
    flex: 1,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: palette.askFrom,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    maxHeight: 320,
  },
  bodyContent: {
    gap: space.md,
    paddingBottom: space.sm,
  },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  error: {
    backgroundColor: palette.dangerSoft,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  suggestions: {
    gap: space.sm,
    alignItems: 'flex-start',
  },
  composer: {
    gap: space.sm,
  },
  input: {
    ...typeScale.body,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    maxHeight: 120,
  },
  empty: {
    gap: space.md,
    paddingVertical: space.lg,
  },
});
