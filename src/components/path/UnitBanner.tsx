import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/primitives';
import { palette, radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

export function UnitBanner({ index, name, completed, total }: { index: number; name: string; completed: number; total: number }) {
  const colors = useColors();
  const done = completed === total;
  return (
    <View style={styles.wrap}>
      <View style={[styles.line, done && styles.lineDone]} />
      <View style={[styles.zone, { backgroundColor: colors.slate }, done && styles.zoneDone]}>
        <Text variant="h3" color={colors.paper}>{index}</Text>
      </View>
      <View style={styles.copy}>
        <Text variant="label" color={done ? palette.emeraldDeep : colors.slate} uppercase>{`Zone ${index} · ${completed}/${total}`}</Text>
        <Text variant="h2" color={done ? colors.ink : colors.inkSoft}>{name}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: 88, position: 'relative', paddingLeft: 70, paddingBottom: space.md, justifyContent: 'center' },
  line: { position: 'absolute', left: 25, top: 44, bottom: 0, width: 4, backgroundColor: '#D8DED9' },
  lineDone: { backgroundColor: palette.emeraldDeep },
  zone: { position: 'absolute', left: 4, top: 16, width: 46, height: 46, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  zoneDone: { backgroundColor: palette.forestInk },
  copy: { gap: space.xs },
});
