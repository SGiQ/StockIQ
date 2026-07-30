import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PillButton, Text } from '@/components/primitives';
import { REPORT_REASONS, type ReportReason } from '@/store/repository';
import { palette, radius, shadow, space } from '@/theme/tokens';

const LABELS: Record<ReportReason, { title: string; detail: string }> = {
  'factually-wrong': {
    title: 'This is factually wrong',
    detail: 'A number, date, or claim on this card is incorrect.',
  },
  confusing: {
    title: 'This is confusing',
    detail: 'The explanation did not land, or contradicts an earlier card.',
  },
  'looks-broken': {
    title: 'Something looks broken',
    detail: 'A chart, label, or answer is not displaying properly.',
  },
  'feels-like-advice': {
    title: 'This reads like advice',
    detail: 'It sounds like it is telling me what to buy or sell.',
  },
};

export interface ReportSheetProps {
  visible: boolean;
  alreadyReported: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason) => void;
}

/**
 * Reporting a card.
 *
 * "This reads like advice" is deliberately one of the four options and not
 * buried under "other". For a finance app that is the report that most needs
 * to reach a human, and burying it would mean never hearing it.
 */
export function ReportSheet({ visible, alreadyReported, onClose, onSubmit }: ReportSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />

      <View style={styles.wrap}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <View style={styles.grabber} />

          <Text variant="h3" color={palette.ink}>
            {alreadyReported ? 'Already reported' : 'Report this card'}
          </Text>
          <Text variant="bodySm" color={palette.slate}>
            {alreadyReported
              ? 'Thanks — this card is flagged. Reporting again updates the reason.'
              : 'Reports are saved on this device and reviewed when StockIQ syncs.'}
          </Text>

          <View style={styles.options}>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                onPress={() => onSubmit(reason)}
                accessibilityRole="button"
                accessibilityLabel={LABELS[reason].title}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <Text variant="bodyEm" color={palette.ink}>
                  {LABELS[reason].title}
                </Text>
                <Text variant="caption" color={palette.slate}>
                  {LABELS[reason].detail}
                </Text>
              </Pressable>
            ))}
          </View>

          <PillButton label="Cancel" variant="ghost" onPress={onClose} />
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
    backgroundColor: palette.paperWarm,
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
    backgroundColor: palette.hairline,
    marginBottom: space.sm,
  },
  options: {
    gap: space.sm,
    marginVertical: space.sm,
  },
  option: {
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xxs,
  },
  optionPressed: {
    opacity: 0.7,
  },
});
