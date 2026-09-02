import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as haptics from '@/lib/haptics';
import type { Card, CardId } from '@/content/types';
import type { ReportReason } from '@/store/repository';
import { useAppStore, useEntitlement } from '@/store/slices/useAppStore';
import { CardRenderer } from '@/components/cards/CardRenderer';
import {
  narrationUrlFor,
  narrationFeedbackCardId,
  type NarrationDeckId,
} from '@/services/narration/speech';
import { useNarration } from '@/services/narration/useNarration';
import { Text } from '@/components/primitives';
import { motion, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';
import { trackTelemetry } from '@/services/telemetry';
import {
  canAdvance,
  consumesTap,
  clampResumeIndex,
  initialStateFor,
  type CardStateMap,
  type CardUiState,
} from './cardState';
import { snapshot } from '@/features/hearts';
import { ActionPill, CardCounter, ExitButton, ProgressBar } from './PlayerChrome';
import { AskSheet } from './AskSheet';
import { ReportSheet } from './ReportSheet';
import { HeartPips } from './HeartPips';
import { OutOfHeartsOverlay } from './OutOfHeartsOverlay';
import { UnlimitedUpsellSheet } from './UnlimitedUpsellSheet';
import { TapZones, TapZoneTutorial } from './TapZones';
import { useUnscrollableStage } from './useUnscrollableStage';

export interface LessonPlayerProps {
  cards: Card[];
  onExit: () => void;
  onComplete: () => void;
  /** Fired once per interactive card when the learner checks their answer. */
  onAnswered?: (cardId: CardId, correct: boolean) => void;
  /** Fired as the learner moves forward, for the resume point. */
  onCardIndex?: (index: number) => void;
  /**
   * Card to open on, for resuming a lesson part-way through. Read once on
   * mount and clamped onto the deck; later changes are ignored so a progress
   * write mid-lesson can never yank the deck to a different card.
   */
  initialIndex?: number;
  /** Pre-answered card states to open with — see `seedResumeStates`. */
  initialStates?: CardStateMap;
  isCardSaved?: (cardId: CardId) => boolean;
  onToggleSave?: (cardId: CardId) => void;
  isCardReported?: (cardId: CardId) => boolean;
  onReport?: (cardId: CardId, reason: ReportReason) => void;
  /** ASK needs these for context; omit to hide the ASK button entirely. */
  askContext?: { lessonTitle: string; courseTitle: string };
  /** Deck-qualified id used to look up pre-rendered card narration. */
  narrationDeckId?: NarrationDeckId;
  showTutorial?: boolean;
  onTutorialDismissed?: () => void;
  /**
   * Enables the hearts gate: a wrong answer costs a heart, and running out
   * blocks the deck until one regenerates. Off for book and strategy guides —
   * only real course lessons put hearts on the line.
   */
  enforceHearts?: boolean;
}

/** How far a swipe must travel (or how fast) to commit to the next card. */
const COMMIT_RATIO = 0.28;
const COMMIT_VELOCITY = 550;

/**
 * The card deck.
 *
 * Three things here carry most of the feel:
 *
 *   1. A render window of three. Mounting all fifteen cards would make every
 *      chart in the lesson lay out on open.
 *   2. A resting position derived directly from the committed index, with
 *      animation applied only as a temporary offset on top. Card i is pinned
 *      at `left: i * width`, so the deck is on the right card even if the
 *      animation never runs.
 *   3. Advance-gating. A forward tap on an unanswered quiz card does not
 *      move the deck; it shakes the answer block instead.
 */
export function LessonPlayer({
  cards,
  onExit,
  onComplete,
  onAnswered,
  onCardIndex,
  initialIndex = 0,
  initialStates,
  isCardSaved,
  onToggleSave,
  isCardReported,
  onReport,
  askContext,
  narrationDeckId,
  showTutorial = false,
  onTutorialDismissed,
  enforceHearts = false,
}: LessonPlayerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  /**
   * Deck geometry.
   *
   * Seeded from the window so the deck is usable on the very first frame,
   * then refined by onLayout, which is authoritative because the stage is
   * not always the window — safe-area insets, tablets, and split view all
   * make them diverge. onLayout alone is not enough: it is not guaranteed to
   * fire promptly on every platform, and a deck that renders nothing until
   * it does is worse than one that starts approximately right.
   */
  const windowWidth = useWindowDimensions().width;
  const [width, setWidth] = useState(windowWidth);
  // Unique per player instance, so the web hook cannot bind to a stale stage
  // if one player is unmounting while the next mounts.
  const stageId = `card-stage-${useId()}`;
  useUnscrollableStage(stageId);

  const [index, setIndex] = useState(() => clampResumeIndex(initialIndex, cards.length));
  const [states, setStates] = useState<CardStateMap>(() => initialStates ?? {});
  const [tutorialVisible, setTutorialVisible] = useState(showTutorial);
  const [askOpen, setAskOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [upsellOpen, setUpsellOpen] = useState(false);

  // One score per card per session, so a re-render never double-counts.
  const scoredRef = useRef<Set<CardId>>(new Set());

  /* ---------------------------------------------------------------- *
   * Hearts gate (course lessons only, and only for free learners)
   * ---------------------------------------------------------------- */
  const heartsState = useAppStore((s) => s.hearts);
  const loseHeart = useAppStore((s) => s.loseHeart);
  const entitlement = useEntitlement();
  // Pro/Elite get unlimited hearts, so the gate is entirely off for them — no
  // pips, no charge, no overlay. This is the whole entitlement payoff: one flag.
  const heartsGateActive = enforceHearts && !entitlement.unlimitedHearts;
  // One charge per card per session: navigating back to a missed card, or a
  // re-render, must not deduct a second heart for the same mistake.
  const chargedRef = useRef<Set<CardId>>(new Set());
  // Bumped when the overlay reports a heart has regenerated, to re-evaluate the
  // gate below with a fresh clock and let play resume.
  const [, setResumeNonce] = useState(0);

  const heartsSnap = heartsGateActive && heartsState ? snapshot(heartsState, Date.now()) : null;
  const outOfHearts = heartsSnap?.empty ?? false;

  const openUpsell = useCallback(() => {
    setUpsellOpen(true);
    void trackTelemetry('hearts_upsell_viewed', narrationDeckId);
  }, [narrationDeckId]);

  useEffect(() => {
    if (outOfHearts) void trackTelemetry('out_of_hearts', narrationDeckId);
  }, [outOfHearts, narrationDeckId]);

  /**
   * Deck position is split in two, deliberately.
   *
   *   - The *resting* position is a plain React style derived from the
   *     committed index. It is always exactly right and does not depend on
   *     any animation running, landing, or firing a callback.
   *   - `offset` is a purely decorative shared value that is zero at rest.
   *     A swipe drives it directly; a tap seeds it to one card-width and
   *     lets it animate back to zero, which reads as the slide.
   *
   * Correctness therefore never rides on the animation engine. An earlier
   * version animated the resting position itself, so a dropped or no-op
   * animation left the deck parked on the wrong card — a failure mode worth
   * designing out rather than debugging per platform.
   */
  const offset = useSharedValue(0);
  const widthSV = useSharedValue(windowWidth);
  const shake = useSharedValue(0);
  /** Safety net that force-zeroes the decorative offset. */
  const offsetReset = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Debounces double-taps. Deliberately time-based rather than a flag
  // cleared by an animation callback: if that callback is ever dropped, a
  // flag would wedge the deck permanently.
  const lastNav = useRef(0);

  const card = cards[index];
  const state = states[card.id] ?? initialStateFor(card);
  const atLast = index === cards.length - 1;

  const narrationEnabled = useAppStore(
    (s) => s.profile?.narrationEnabled ?? false,
  );
  const narrationVoice = useAppStore(
    (s) => s.profile?.narrationVoice ?? 'female',
  );
  const narrationSpeed = useAppStore(
    (s) => s.profile?.narrationSpeed ?? 1,
  );
  const setNarrationEnabled = useAppStore((s) => s.setNarrationEnabled);
  const answered =
    state.kind === 'choice' || state.kind === 'blank'
      ? state.checked
        ? state.correct
        : undefined
      : undefined;
  const narrationCardId =
    answered === undefined ? card.id : narrationFeedbackCardId(card.id, answered);
  const narrationSource = narrationDeckId
    ? narrationUrlFor(narrationDeckId, narrationCardId, narrationVoice)
    : null;
  const {
    available: narrationAvailable,
    playing: narrationPlaying,
    play: playNarration,
    stop: stopNarration,
  } = useNarration(narrationSource, narrationEnabled, narrationSpeed);

  /** Render window of three: previous, current, next. */
  const visible = useMemo(
    () => [index - 1, index, index + 1].filter((i) => i >= 0 && i < cards.length),
    [index, cards.length],
  );

  /* ---------------------------------------------------------------- *
   * Navigation
   * ---------------------------------------------------------------- */

  /**
   * Animates the decorative offset back to rest.
   *
   * The timeout is a deliberate belt-and-braces: if the animation is
   * interrupted or silently no-ops, the offset is forced to zero anyway, so
   * the deck lands on the correct card either way.
   */
  const relax = useCallback(() => {
    offset.value = withTiming(0, { duration: motion.normal });
    if (offsetReset.current) clearTimeout(offsetReset.current);
    offsetReset.current = setTimeout(() => {
      offset.value = 0;
    }, motion.normal + 160);
  }, [offset]);

  useEffect(() => () => {
    if (offsetReset.current) clearTimeout(offsetReset.current);
  }, []);

  const settle = useCallback(
    (next: number) => {
      const now = Date.now();
      if (now - lastNav.current < 180) return;
      lastNav.current = now;

      // Keep the visual position continuous across the commit. The resting
      // base is about to jump by one card-width, so the offset absorbs that
      // jump and then relaxes away. Adding the existing offset rather than
      // overwriting it is what makes a committed *swipe* continue smoothly
      // from wherever the finger let go, instead of snapping.
      const direction = next > index ? 1 : -1;
      offset.value = direction * width + offset.value;

      stopNarration();
      setIndex(next);
      onCardIndex?.(next);
      relax();
    },
    [index, offset, onCardIndex, relax, stopNarration, width],
  );

  const refuse = useCallback(() => {
    haptics.warn();
    relax();
    shake.value = withSequence(
      withTiming(-9, { duration: 55 }),
      withTiming(9, { duration: 55 }),
      withTiming(-5, { duration: 45 }),
      withTiming(0, { duration: 45 }),
    );
  }, [relax, shake]);

  const dismissTutorial = useCallback(() => {
    if (!tutorialVisible) return;
    setTutorialVisible(false);
    onTutorialDismissed?.();
  }, [onTutorialDismissed, tutorialVisible]);

  const goForward = useCallback(() => {
    // The first tap only clears the tutorial — it should teach the gesture,
    // not skip the card the learner has not read yet.
    if (tutorialVisible) {
      dismissTutorial();
      return;
    }
    if (!canAdvance(card, state)) {
      refuse();
      return;
    }
    if (atLast) {
      stopNarration();
      onComplete();
      return;
    }
    settle(index + 1);
  }, [
    atLast,
    card,
    dismissTutorial,
    index,
    onComplete,
    refuse,
    settle,
    state,
    stopNarration,
    tutorialVisible,
  ]);

  const goBack = useCallback(() => {
    if (tutorialVisible) {
      dismissTutorial();
      return;
    }
    if (index === 0) {
      // Already at the first card — rubber-band back.
      relax();
      return;
    }
    settle(index - 1);
  }, [dismissTutorial, index, relax, settle, tutorialVisible]);

  /* ---------------------------------------------------------------- *
   * Gestures
   * ---------------------------------------------------------------- */

  // activeOffsetX keeps taps from being swallowed: the pan only takes over
  // once the finger has genuinely moved sideways.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-14, 14])
        .failOffsetY([-24, 24])
        .onUpdate((event) => {
          offset.value = event.translationX;
        })
        .onEnd((event) => {
          const travelled = event.translationX;
          const fast = Math.abs(event.velocityX) > COMMIT_VELOCITY;
          const far = Math.abs(travelled) > widthSV.value * COMMIT_RATIO;

          // Either way the offset relaxes to zero. On a committed swipe the
          // resting position has already moved to the new card, so the same
          // relax reads as the card sliding home.
          if (!far && !fast) {
            runOnJS(relax)();
            return;
          }
          if (travelled < 0) runOnJS(goForward)();
          else runOnJS(goBack)();
        }),
    [goBack, goForward, offset, relax, widthSV],
  );

  /** Purely the decorative displacement; the resting position is a plain style. */
  const offsetStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  /* ---------------------------------------------------------------- *
   * Card state
   * ---------------------------------------------------------------- */

  const setCardState = useCallback(
    (cardId: CardId, next: CardUiState) => {
      setStates((prev) => ({ ...prev, [cardId]: next }));
    },
    [],
  );

  const revealNextSticker = useCallback(() => {
    if (card.type !== 'sticker_reveal') return;
    const current = state.kind === 'sticker' ? state.revealed : 0;
    if (current >= card.stickers.length) return;
    haptics.tap();
    setCardState(card.id, { kind: 'sticker', revealed: current + 1 });
    dismissTutorial();
  }, [card, dismissTutorial, setCardState, state]);

  const saved = isCardSaved?.(card.id) ?? false;
  const reported = isCardReported?.(card.id) ?? false;

  const exit = useCallback(() => {
    stopNarration();
    onExit();
  }, [onExit, stopNarration]);

  const toggleNarration = useCallback(() => {
    if (!narrationAvailable) return;
    if (narrationPlaying) {
      stopNarration();
      void setNarrationEnabled(false);
      return;
    }

    // Browsers block autoplay until the learner interacts with the page. If
    // narration is already enabled but that first autoplay was refused, one
    // speaker tap should start the card instead of silently disabling it.
    playNarration();
    void trackTelemetry('narration_played', narrationDeckId);
    if (!narrationEnabled) void setNarrationEnabled(true);
  }, [
    narrationAvailable,
    narrationEnabled,
    narrationPlaying,
    playNarration,
    narrationDeckId,
    setNarrationEnabled,
    stopNarration,
  ]);

  return (
    // Measured here rather than on the stage: GestureDetector does not
    // forward onLayout to its child. The root has no horizontal padding, so
    // its width is the stage width.
    <View
      style={[styles.root, { backgroundColor: colors.paper }]}
      onLayout={(e) => {
        const next = e.nativeEvent.layout.width;
        if (next > 0 && next !== width) {
          setWidth(next);
          // The animated style reads this directly, so a resize re-anchors
          // the deck on the next frame with no further bookkeeping.
          widthSV.value = next;
        }
      }}
    >
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <ExitButton onPress={exit} />
        <ProgressBar current={index} total={cards.length} />
        {heartsGateActive ? (
          <HeartPips state={heartsState} now={Date.now()} onPress={openUpsell} />
        ) : (
          <CardCounter current={index} total={cards.length} />
        )}
      </View>


      <GestureDetector gesture={pan}>
        {/*
          `pinnedScroll` is undefined on native. On web it holds this box at
          scroll offset zero: it clips with `overflow: hidden` but still
          scrolls programmatically when a tap zone takes focus, which slides
          the transform-positioned deck out of register for good.
        */}
        <View style={styles.stage} nativeID={stageId}>
          {/* Beneath the deck, so inert card content routes taps here. */}
          <TapZones onBack={goBack} onForward={goForward} />

          {/*
            Two nested layers, and the split matters:
              outer — a PLAIN style carrying the resting position. Correct on
                      the first frame and on every index change, with no
                      dependency on the animation engine.
              inner — the animated slide offset, zero at rest.
            Transforms compose, so card `index` lands at exactly `offset`.
          */}
          <View
            style={[StyleSheet.absoluteFill, { transform: [{ translateX: -index * width }] }]}
            pointerEvents="box-none"
          >
            <Animated.View
              style={[StyleSheet.absoluteFill, offsetStyle]}
              pointerEvents="box-none"
            >
            {width > 0 &&
              visible.map((i) => {
              const windowCard = cards[i];
              const isCurrent = i === index;
              return (
                <View
                  key={windowCard.id}
                  style={[styles.cardSlot, { left: i * width, width }]}
                  pointerEvents={isCurrent ? 'box-none' : 'none'}
                >
                  <CardRenderer
                    card={windowCard}
                    state={states[windowCard.id] ?? initialStateFor(windowCard)}
                    onStateChange={(next) => setCardState(windowCard.id, next)}
                    onAnswered={(correct) => {
                      onAnswered?.(windowCard.id, correct);
                      if (!scoredRef.current.has(windowCard.id)) {
                        scoredRef.current.add(windowCard.id);
                        haptics[correct ? 'tap' : 'warn']();
                      }
                      // A wrong answer costs a heart — once per card per session.
                      if (heartsGateActive && !correct && !chargedRef.current.has(windowCard.id)) {
                        chargedRef.current.add(windowCard.id);
                        void loseHeart();
                        void trackTelemetry('heart_lost', narrationDeckId);
                      }
                    }}
                    onAdvance={goForward}
                    shakeStyle={isCurrent ? shakeStyle : undefined}
                    active={isCurrent}
                  />

                  {/*
                    Sticker cards consume the tap themselves. This overlay sits
                    above the tap zones so a reveal never doubles as a forward
                    navigation.
                  */}
                  {isCurrent && consumesTap(windowCard, states[windowCard.id]) && (
                    <Pressable
                      style={StyleSheet.absoluteFill}
                      onPress={revealNextSticker}
                      accessibilityRole="button"
                      accessibilityLabel="Reveal next"
                    />
                  )}
                </View>
              );
            })}
            </Animated.View>
          </View>

          {/* Above the deck so it fully masks the first card. */}
          {tutorialVisible && <TapZoneTutorial />}
        </View>
      </GestureDetector>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <ActionPill
          saved={saved}
          reported={reported}
          onToggleSave={() => onToggleSave?.(card.id)}
          onReport={() => setReportOpen(true)}
          onAsk={() => setAskOpen(true)}
          narrationAvailable={narrationAvailable}
          narrationEnabled={narrationEnabled}
          narrationPlaying={narrationPlaying}
          onToggleNarration={toggleNarration}
        />
      </View>

      {askContext && (
        <AskSheet
          visible={askOpen}
          onClose={() => setAskOpen(false)}
          card={card}
          lessonTitle={askContext.lessonTitle}
          courseTitle={askContext.courseTitle}
        />
      )}

      <ReportSheet
        visible={reportOpen}
        alreadyReported={reported}
        onClose={() => setReportOpen(false)}
        onSubmit={(reason) => {
          onReport?.(card.id, reason);
          setReportOpen(false);
        }}
      />

      {heartsGateActive && (
        <UnlimitedUpsellSheet visible={upsellOpen} onClose={() => setUpsellOpen(false)} />
      )}

      {/*
        Last child, so its absolute fill covers the header, deck, and footer.
        Rendered only while empty; it owns its own countdown clock and asks the
        player to re-evaluate the gate once a heart has regenerated.
      */}
      {outOfHearts && heartsState && (
        <OutOfHeartsOverlay
          state={heartsState}
          onGoUnlimited={openUpsell}
          onExit={exit}
          onRegenerated={() => setResumeNonce((n) => n + 1)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Cards live at `left: i * width`, so the deck is far wider than the
    // screen. Without clipping, neighbouring cards bleed into view and the
    // document itself becomes horizontally scrollable on web.
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  stage: {
    flex: 1,
    overflow: 'hidden',
  },
  cardSlot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
  },
  footer: {
    paddingTop: space.sm,
  },
});
