import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeUp, PillButton, Text } from '@/components/primitives';
import { formatCountdown, snapshot } from '@/features/hearts';
import { HEART_REFILL_COST } from '@/features/gems';
import { useAppStore } from '@/store/slices/useAppStore';
import { GemIcon } from '@/components/Currency';
import type { HeartsValue } from '@/store/repository';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';
import { HEART_PATH } from './HeartPips';

function BrokenHeart() {
  const colors = useColors();
  return (
    <Svg width={84} height={84} viewBox="0 0 24 24">
      <Path
        d={HEART_PATH}
        fill={palette.dangerSoft}
        stroke={palette.danger}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {/* A jagged crack down the middle turns the heart into an empty one. */}
      <Path
        d="M12 4.5l-1.7 5.2 2.6 1.8-2 2 1.3 4.4"
        fill="none"
        stroke={colors.paper}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export interface OutOfHeartsOverlayProps {
  state: HeartsValue;
  onGoUnlimited: () => void;
  onExit: () => void;
  /** Fires once a heart has regenerated back, so the player can resume. */
  onRegenerated: () => void;
}

/**
 * The blocking gate shown when a learner runs out of hearts.
 *
 * It owns its own one-second clock so only this overlay re-renders while the
 * countdown ticks — the card deck beneath (charts and all) does not. When a
 * heart regenerates it tells the player, which unmounts the overlay and lets
 * play continue. Two ways out: wait, or convert.
 */
export function OutOfHeartsOverlay({
  state,
  onGoUnlimited,
  onExit,
  onRegenerated,
}: OutOfHeartsOverlayProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  const regenNotified = useRef(false);

  const gemBalance = useAppStore((s) => s.gems?.balance ?? 0);
  const refillWithGems = useAppStore((s) => s.refillHeartsWithGems);
  const canAffordRefill = gemBalance >= HEART_REFILL_COST;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const snap = snapshot(state, now);

  useEffect(() => {
    if (snap.count > 0 && !regenNotified.current) {
      regenNotified.current = true;
      onRegenerated();
    }
  }, [snap.count, onRegenerated]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.lg, backgroundColor: colors.paper }]}>
      <FadeUp style={styles.body} distance={24} durationMs={360}>
        <BrokenHeart />

        <Text variant="display" align="center">
          Out of hearts
        </Text>

        <Text variant="body" color={colors.slate} align="center">
          You miss a heart for each wrong answer. Take a breather — the next one
          comes back in{' '}
          <Text variant="bodyEm">
            {formatCountdown(snap.nextInMs)}
          </Text>
          .
        </Text>

        <View style={styles.timerPill}>
          <Text variant="label" color={palette.danger} uppercase>
            {`Next heart in ${formatCountdown(snap.nextInMs)}`}
          </Text>
        </View>

        <View style={styles.gemRow}>
          <GemIcon size={15} />
          <Text variant="caption" color={colors.slate}>
            {canAffordRefill
              ? `You have ${gemBalance} gems`
              : `${gemBalance} / ${HEART_REFILL_COST} gems — earn more in lessons and review`}
          </Text>
        </View>
      </FadeUp>

      <FadeUp style={styles.actions} delayMs={120} distance={18} durationMs={320}>
        {canAffordRefill ? (
          <PillButton
            label={`Refill hearts · ${HEART_REFILL_COST} gems`}
            variant="dark"
            onPress={() => void refillWithGems()}
          />
        ) : null}
        <PillButton label="Go Unlimited" variant="primary" onPress={onGoUnlimited} />
        <PillButton label="Leave lesson" variant="ghost" onPress={onExit} />
      </FadeUp>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    maxWidth: 420,
  },
  timerPill: {
    backgroundColor: palette.dangerSoft,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    marginTop: space.sm,
  },
  gemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.xs,
  },
  actions: {
    alignSelf: 'stretch',
    gap: space.sm,
    maxWidth: 420,
    width: '100%',
  },
});
