import { useCallback, useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as haptics from '@/lib/haptics';
import type { BinaryChoiceCard } from '@/content/types';
import type { CardUiState } from '@/components/player/cardState';
import { ArtView } from '@/components/art/ArtView';
import { FadeUp, PillButton, RichTextView, Text } from '@/components/primitives';
import { easeOutQuad, linearClamped } from '@/lib/easing';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

export interface BinaryChoiceCardViewProps {
  card: BinaryChoiceCard;
  state: CardUiState;
  onChange: (next: CardUiState) => void;
  onAnswered: (correct: boolean) => void;
  /** Registered by the player so a blocked forward tap can shake this card. */
  shakeStyle?: object;
  active?: boolean;
}

/**
 * Two stacked options, then a black "Check Answer" pill, then the verdict.
 *
 * The deck stays locked here until Check Answer has been pressed — selecting
 * an option is not enough. That extra beat is what makes the learner commit
 * before seeing the result.
 */
export function BinaryChoiceCardView({
  card,
  state,
  onChange,
  onAnswered,
  shakeStyle,
  active = true,
}: BinaryChoiceCardViewProps) {
  const colors = useColors();
  const selected = state.kind === 'choice' ? state.selected : undefined;
  const checked = state.kind === 'choice' ? state.checked : false;
  const correct = state.kind === 'choice' ? state.correct : undefined;

  const select = useCallback(
    (id: string) => {
      if (checked) return;
      haptics.select();
      onChange({ kind: 'choice', selected: id, checked: false });
    },
    [checked, onChange],
  );

  const check = useCallback(() => {
    if (!selected || checked) return;
    const isCorrect = card.options.some((o) => o.id === selected && o.correct);
    haptics.verdict(isCorrect);
    onChange({ kind: 'choice', selected, checked: true, correct: isCorrect });
    onAnswered(isCorrect);
  }, [card.options, checked, onAnswered, onChange, selected]);

  return (
    // The prompt and art are explicitly inert so a tap on them still reaches
    // the navigation zones; only the options and Check Answer are targets.
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.prompt} pointerEvents="none">
        <RichTextView value={card.prompt} variant="h2" color={colors.ink} />
        {card.art && (
          <ArtView
            spec={card.art}
            aspectRatio={card.art.kind === 'illustration' ? 4 / 3 : 1.5}
            glyphSize={56}
            active={active}
          />
        )}
      </View>

      <Animated.View style={[styles.options, shakeStyle]}>
        {card.options.map((option, index) => {
          const isSelected = selected === option.id;
          // After checking, the correct option always goes green and a wrong
          // pick goes red — showing the right answer matters more than
          // preserving the suspense of the selection state.
          const variant = checked
            ? option.correct
              ? 'primary'
              : isSelected
                ? 'primary'
                : 'secondary'
            : isSelected
              ? 'primary'
              : 'secondary';

          const overrideColor = checked
            ? option.correct
              ? palette.success
              : isSelected
                ? palette.danger
                : undefined
            : undefined;

          const verdict = !checked ? null : option.correct ? 'correct' : isSelected ? 'wrong' : null;

          return (
            <VerdictShell key={option.id} verdict={verdict}>
              <PillButton
                label={option.label}
                variant={variant}
                disabled={checked}
                haptic={false}
                onPress={() => select(option.id)}
                style={{
                  ...(overrideColor ? { backgroundColor: overrideColor } : null),
                  ...(index === 0 ? {} : {}),
                }}
              />
            </VerdictShell>
          );
        })}

        {!checked && (
          <PillButton
            label="Check Answer"
            variant="dark"
            disabled={!selected}
            onPress={check}
            style={styles.check}
          />
        )}
      </Animated.View>

      {checked && (
        <FadeUp
          pointerEvents="none"
          style={[
            styles.explanation,
            { backgroundColor: correct ? palette.successSoft : palette.dangerSoft },
          ]}
        >
          <Text variant="label" color={correct ? palette.success : palette.danger} uppercase>
            {correct ? 'Correct' : 'Not quite'}
          </Text>
          <RichTextView
            value={card.explanation}
            variant="bodySm"
            color={colors.inkSoft}
            style={styles.explanationBody}
          />
        </FadeUp>
      )}
    </View>
  );
}

/**
 * The verdict beat on an option: the correct one swells once (1 → 1.04 → 1),
 * a wrong pick shakes sideways. Plays when the verdict lands, not on every
 * re-render, and not under reduced motion. The tint is the PillButton's own.
 */
export function VerdictShell({ verdict, children }: { verdict: 'correct' | 'wrong' | null; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const shift = useSharedValue(0);

  useEffect(() => {
    if (!verdict || reduceMotion) return;
    if (verdict === 'correct') {
      scale.value = withSequence(
        withTiming(1.04, { duration: 160, easing: easeOutQuad, reduceMotion: ReduceMotion.System }),
        withTiming(1, { duration: 220, easing: easeOutQuad, reduceMotion: ReduceMotion.System }),
      );
    } else {
      shift.value = withSequence(
        withTiming(-7, { duration: 60, easing: linearClamped, reduceMotion: ReduceMotion.System }),
        withTiming(7, { duration: 80, easing: linearClamped, reduceMotion: ReduceMotion.System }),
        withTiming(-4, { duration: 80, easing: linearClamped, reduceMotion: ReduceMotion.System }),
        withTiming(4, { duration: 70, easing: linearClamped, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 70, easing: linearClamped, reduceMotion: ReduceMotion.System }),
      );
    }
  }, [verdict, reduceMotion, scale, shift]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shift.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: space.md,
    gap: space.lg,
  },
  /**
   * Same shrink guard as ConceptCardView, for the same reason: the card is
   * centred and clipped, so content taller than the box loses slices off the
   * TOP as well as the bottom and a prompt can lose its first line.
   *
   * This card is the worse case, because its tallest state is not the one you
   * see while authoring — after answering it also renders an explanation. The
   * prompt block gives way first; the options and Check Answer must never
   * move, since they are the interaction.
   */
  prompt: {
    gap: space.lg,
    flexShrink: 1,
  },
  options: {
    gap: space.sm,
    flexShrink: 0,
  },
  check: {
    marginTop: space.sm,
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
