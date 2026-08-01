import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import * as haptics from '@/lib/haptics';
import type { FillBlankCard } from '@/content/types';
import type { CardUiState } from '@/components/player/cardState';
import { PillButton, RichTextView, Text } from '@/components/primitives';
import { palette, radius, shadow, space } from '@/theme/tokens';

export interface FillBlankCardViewProps {
  card: FillBlankCard;
  state: CardUiState;
  onChange: (next: CardUiState) => void;
  onAnswered: (correct: boolean) => void;
  shakeStyle?: object;
}

/**
 * Prose with one inline blank, filled from a floating word bank.
 *
 * The blank is rendered inline inside the sentence rather than below it, so
 * the learner reads the completed sentence as a sentence — which is the
 * whole retrieval-practice point of the format.
 */
export function FillBlankCardView({
  card,
  state,
  onChange,
  onAnswered,
  shakeStyle,
}: FillBlankCardViewProps) {
  const picked = state.kind === 'blank' ? state.picked : undefined;
  const choicesOpen = state.kind === 'blank' ? state.choicesOpen : false;
  const checked = state.kind === 'blank' ? state.checked : false;
  const correct = state.kind === 'blank' ? state.correct : undefined;

  const pick = useCallback(
    (word: string) => {
      if (checked) return;
      haptics.select();
      onChange({ kind: 'blank', choicesOpen: true, picked: word, checked: false });
    },
    [checked, onChange],
  );

  const check = useCallback(() => {
    if (!picked || checked) return;
    const isCorrect = picked === card.answer;
    haptics.verdict(isCorrect);
    onChange({ kind: 'blank', choicesOpen: true, picked, checked: true, correct: isCorrect });
    onAnswered(isCorrect);
  }, [card.answer, checked, onAnswered, onChange, picked]);

  const blankColor = !checked ? palette.azure : correct ? palette.success : palette.danger;

  return (
    // The sentence is inert so taps on it still reach the navigation zones;
    // only the word bank and Check Answer are hit targets.
    <View style={styles.container} pointerEvents="box-none">
      <View pointerEvents="none">
        <RichTextView
          value={card.body}
          variant="h3"
          color={palette.ink}
          renderBlank={() => (
            <Text variant="h3" color={palette.paper} style={{ backgroundColor: blankColor }}>
              {`  ${picked ?? '?'}  `}
            </Text>
          )}
        />
      </View>

      <Animated.View style={[styles.bankWrap, shakeStyle]}>
        {!checked && !choicesOpen ? (
          <PillButton
            label="Tap the blank to reveal choices"
            variant="secondary"
            haptic={false}
            onPress={() => onChange({ kind: 'blank', choicesOpen: true, checked: false })}
          />
        ) : null}

        {!checked && choicesOpen ? (
          <View style={styles.bank}>
            {card.wordBank.map((word) => {
              const isPicked = picked === word;
              return (
                <Pressable
                  key={word}
                  onPress={() => pick(word)}
                  accessibilityRole="button"
                  accessibilityLabel={word}
                  accessibilityState={{ selected: isPicked }}
                  style={({ pressed }) => [
                    styles.bankRow,
                    isPicked && styles.bankRowPicked,
                    pressed && styles.bankRowPressed,
                  ]}
                >
                  <Text
                    variant="h3"
                    color={palette.paper}
                    align="center"
                    style={isPicked ? undefined : styles.bankWordIdle}
                  >
                    {word}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!checked && choicesOpen && (
          <PillButton label="Check Answer" variant="dark" disabled={!picked} onPress={check} />
        )}
      </Animated.View>

      {checked && (
        <View
          pointerEvents="none"
          style={[
            styles.explanation,
            { backgroundColor: correct ? palette.successSoft : palette.dangerSoft },
          ]}
        >
          <Text variant="label" color={correct ? palette.success : palette.danger} uppercase>
            {correct ? 'Correct' : `Answer: ${card.answer}`}
          </Text>
          {card.explanation && (
            <RichTextView
              value={card.explanation}
              variant="bodySm"
              color={palette.inkSoft}
              style={styles.explanationBody}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  bankWrap: {
    gap: space.md,
  },
  bank: {
    backgroundColor: palette.azure,
    borderRadius: radius.lg,
    paddingVertical: space.xs,
    ...shadow.floating,
  },
  bankRow: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth * 3,
    borderBottomColor: 'rgba(255,255,255,0.35)',
  },
  bankRowPicked: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  bankRowPressed: {
    opacity: 0.75,
  },
  bankWordIdle: {
    opacity: 0.92,
  },
  explanation: {
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.xs,
  },
  explanationBody: {
    marginTop: space.xxs,
  },
});
