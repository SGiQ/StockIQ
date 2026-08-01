import { StyleSheet, View } from 'react-native';
import { Glyph } from '@/components/art/Glyph';
import { Text } from '@/components/primitives';
import { palette, radius, shadow, space } from '@/theme/tokens';

export function UnitBanner({ index, name, completed, total }: { index: number; name: string; completed: number; total: number }) {
  const pct = total ? completed / total : 0;
  return (
    <View style={[styles.banner, shadow.card]}>
      <View style={styles.badge}>
        <Glyph name={completed === total ? 'check' : 'building'} size={25} color={palette.paper} strokeWidth={2.3} />
      </View>
      <View style={styles.copy}>
        <Text variant="label" color={palette.violetInk} uppercase>{`District ${index}`}</Text>
        <Text variant="bodySm" color={palette.ink} numberOfLines={2} style={styles.name}>{name}</Text>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} /></View>
      </View>
      <Text variant="label" color={palette.slate}>{`${completed}/${total}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderColor: '#D8C9F2', backgroundColor: '#F5F0FC', borderRadius: radius.lg, padding: space.md, marginBottom: space.sm },
  badge: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: palette.violet, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-2deg' }] },
  copy: { flex: 1, gap: space.xs },
  name: { fontWeight: '700' },
  track: { height: 5, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: '#DDD4EA' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: palette.emeraldDeep },
});
