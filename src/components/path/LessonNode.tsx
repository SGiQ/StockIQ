import { Pressable, StyleSheet, View } from 'react-native';
import { Glyph } from '@/components/art/Glyph';
import { Text } from '@/components/primitives';
import type { GlyphName } from '@/content/types';
import type { LessonNodeStatus } from '@/store/slices/useAppStore';
import { artPalettes, palette, radius, shadow, space } from '@/theme/tokens';

export interface LessonNodeProps {
  lessonId: string;
  title: string;
  status: LessonNodeStatus;
  starred?: boolean;
  position: 'left' | 'right';
  isCurrent?: boolean;
  isLast?: boolean;
  onPress: () => void;
}

const landmarkFor = (id: string): GlyphName => {
  if (id.includes('candle')) return 'candle';
  if (id.includes('chart') || id.includes('price') || id.includes('trend') || id.includes('momentum')) return 'chart-up';
  if (id.includes('exchange') || id.includes('spread') || id.includes('order')) return 'exchange';
  if (id.includes('share') || id.includes('stock') || id.includes('diversif')) return 'pie';
  if (id.includes('cash') || id.includes('revenue') || id.includes('earning') || id.includes('margin')) return 'coins-stack';
  if (id.includes('cap') || id.includes('index') || id.includes('quote')) return 'building';
  if (id.includes('risk') || id.includes('loss') || id.includes('stop')) return 'shield';
  if (id.includes('position') || id.includes('ratio') || id.includes('correlation')) return 'scale';
  if (id.includes('journal') || id.includes('process')) return 'briefcase';
  if (id.includes('fear') || id.includes('bias') || id.includes('revenge')) return 'brain';
  if (id.includes('patience') || id.includes('average')) return 'clock';
  return 'bank';
};

export function LessonNode({
  lessonId,
  title,
  status,
  starred,
  position,
  isCurrent,
  isLast,
  onPress,
}: LessonNodeProps) {
  const locked = status === 'locked';
  const completed = status === 'completed';
  const routeColor = completed ? palette.emeraldDeep : palette.hairline;
  const art = completed ? artPalettes.mint : locked ? { bg: '#F1F1EF', ink: palette.slateLight } : artPalettes.butter;

  return (
    <View style={styles.row}>
      {!isLast ? <View style={[styles.routeDown, { backgroundColor: routeColor }]} /> : null}
      <View
        style={[
          styles.routeAcross,
          position === 'left' ? styles.routeLeft : styles.routeRight,
          { backgroundColor: routeColor },
        ]}
      />
      <View style={[styles.stop, position === 'left' ? styles.stopLeft : styles.stopRight]}>
        {isCurrent ? (
          <View style={styles.currentLabel}>
            <Text variant="label" color={palette.forestDeep} uppercase>You are here</Text>
          </View>
        ) : null}
        <Pressable
          onPress={onPress}
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ disabled: locked, selected: isCurrent }}
          style={({ pressed }) => [
            styles.landmark,
            locked && styles.landmarkLocked,
            isCurrent && styles.landmarkCurrent,
            !locked && shadow.card,
            { transform: [{ rotate: position === 'left' ? '-1deg' : '1deg' }, { scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <View style={[styles.iconTile, { backgroundColor: art.bg }]}>
            <Glyph name={locked ? 'lock' : landmarkFor(lessonId)} size={36} color={art.ink} strokeWidth={2.1} />
          </View>
          <View style={styles.copy}>
            <Text variant="label" color={completed ? palette.emeraldDeep : locked ? palette.slateLight : palette.flame} uppercase>
              {completed ? (starred ? 'Mastered ★' : 'Complete') : locked ? 'Locked' : isCurrent ? 'Next stop' : 'Open'}
            </Text>
            <Text variant="bodySm" color={locked ? palette.slateLight : palette.ink} numberOfLines={3} style={styles.title}>
              {title}
            </Text>
          </View>
        </Pressable>
        <View
          style={[
            styles.routePin,
            position === 'left' ? styles.pinRight : styles.pinLeft,
            { backgroundColor: completed ? palette.emeraldDeep : isCurrent ? palette.flame : palette.hairline },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 156, position: 'relative' },
  routeDown: { position: 'absolute', width: 4, top: 78, bottom: -78, left: '50%', marginLeft: -2, borderRadius: radius.pill },
  routeAcross: { position: 'absolute', height: 4, top: 76, width: '26%', borderRadius: radius.pill },
  routeLeft: { left: '25%' },
  routeRight: { right: '25%' },
  stop: { position: 'absolute', width: '48%', top: 10 },
  stopLeft: { left: 0 },
  stopRight: { right: 0 },
  currentLabel: { alignSelf: 'center', backgroundColor: '#FFF4D7', borderColor: palette.flameSoft, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, marginBottom: -5, zIndex: 2 },
  landmark: { minHeight: 124, backgroundColor: palette.paper, borderRadius: radius.md, borderWidth: 1, borderColor: '#DED8CE', padding: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  landmarkLocked: { backgroundColor: '#F8F8F6', borderColor: palette.hairline, shadowOpacity: 0 },
  landmarkCurrent: { borderColor: palette.flame, borderWidth: 2, backgroundColor: '#FFFCF5' },
  iconTile: { width: 58, height: 78, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: space.xs },
  title: { fontWeight: '600' },
  routePin: { position: 'absolute', width: 16, height: 16, borderRadius: radius.pill, top: 60, borderWidth: 4, borderColor: palette.paper, ...(shadow.sticker as object) },
  pinRight: { right: -8 },
  pinLeft: { left: -8 },
});
