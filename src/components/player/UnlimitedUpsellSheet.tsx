import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillButton, Text } from '@/components/primitives';
import { palette, radius, shadow, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';
import { HeartIcon } from './HeartPips';

const PERKS: string[] = [
  'Unlimited hearts — practise as much as you want',
  'No ads between lessons',
  'Unlimited AI tutor (ASK)',
  'The full Knowledge Base: traders, strategies, books',
];

export interface UnlimitedUpsellSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * The "Go Unlimited" surface.
 *
 * A placeholder until billing lands: it presents StockIQ Pro and captures
 * intent, but there is no checkout yet, so it is honest about "coming soon"
 * rather than dangling a buy button that does nothing. When Stripe web checkout
 * ships (see docs/monetization.md), the single CTA here becomes the entry
 * point — nothing else about the gate has to change.
 */
export function UnlimitedUpsellSheet({ visible, onClose }: UnlimitedUpsellSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />

      <View style={styles.wrap}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md, backgroundColor: colors.paperWarm }]}>
          <View style={[styles.grabber, { backgroundColor: colors.hairline }]} />

          <View style={styles.heading}>
            <HeartIcon size={26} filled color={palette.danger} />
            <Text variant="h3">
              Never run out with StockIQ Pro
            </Text>
          </View>

          <Text variant="bodySm" color={colors.slate}>
            Hearts keep the free lesson honest. Pro removes them entirely — plus
            everything below.
          </Text>

          <View style={styles.perks}>
            {PERKS.map((perk) => (
              <View key={perk} style={styles.perkRow}>
                <View style={styles.tick}>
                  <Text variant="label" color={colors.paper}>
                    ✓
                  </Text>
                </View>
                <Text variant="body" style={styles.perkText}>
                  {perk}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.soon, { backgroundColor: colors.paper }]}>
            <Text variant="label" color={palette.forestDeep} uppercase>
              Coming soon
            </Text>
            <Text variant="caption" color={colors.slate}>
              Pro is in the works. For now, hearts refill on their own — no
              charge.
            </Text>
          </View>

          <PillButton label="Got it" variant="dark" onPress={onClose} />
        </View>
      </View>
    </Modal>
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
  wrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.sm,
    ...shadow.floating,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    marginBottom: space.sm,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  perks: {
    gap: space.sm,
    marginVertical: space.sm,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  tick: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: palette.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkText: {
    flex: 1,
  },
  soon: {
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xxs,
  },
});
