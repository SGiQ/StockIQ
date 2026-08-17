import { Linking, Pressable, StyleSheet, View } from 'react-native';
import type { ContentSource } from '@/content/types';
import { Glyph } from '@/components/art/Glyph';
import { Text } from '@/components/primitives';
import { radius, space } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

export function SourceLinks({ sources, compact = false }: { sources: ContentSource[]; compact?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <Text variant="label" color={colors.slate} uppercase>
        Sources
      </Text>
      <View style={styles.list}>
        {sources.map((source) => (
          <Pressable
            key={source.url}
            onPress={() => void Linking.openURL(source.url)}
            accessibilityRole="link"
            accessibilityLabel={`${source.title}, ${source.publisher}`}
            style={({ pressed }) => [
              styles.source,
              { borderColor: colors.hairline, backgroundColor: colors.paper },
              compact && styles.sourceCompact,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.text}>
              <Text variant={compact ? 'caption' : 'bodyEm'} numberOfLines={2}>
                {source.title}
              </Text>
              <Text variant="caption" color={colors.slate}>{source.publisher}</Text>
            </View>
            <Glyph name="arrow-up" size={17} color={colors.slate} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, alignSelf: 'stretch' },
  list: { gap: space.sm },
  source: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  sourceCompact: { minHeight: 54, paddingVertical: space.sm },
  text: { flex: 1, gap: space.xxs },
  pressed: { opacity: 0.68 },
});
