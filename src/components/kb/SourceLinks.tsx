import { Linking, Pressable, StyleSheet, View } from 'react-native';
import type { ContentSource } from '@/content/types';
import { Glyph } from '@/components/art/Glyph';
import { Text } from '@/components/primitives';
import { palette, radius, space } from '@/theme/tokens';

export function SourceLinks({ sources, compact = false }: { sources: ContentSource[]; compact?: boolean }) {
  return (
    <View style={styles.wrap}>
      <Text variant="label" color={palette.slate} uppercase>
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
              compact && styles.sourceCompact,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.text}>
              <Text variant={compact ? 'caption' : 'bodyEm'} color={palette.ink} numberOfLines={2}>
                {source.title}
              </Text>
              <Text variant="caption" color={palette.slate}>{source.publisher}</Text>
            </View>
            <Glyph name="arrow-up" size={17} color={palette.slate} />
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
    borderColor: palette.hairline,
    borderRadius: radius.md,
    backgroundColor: palette.paper,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  sourceCompact: { minHeight: 54, paddingVertical: space.sm },
  text: { flex: 1, gap: space.xxs },
  pressed: { opacity: 0.68 },
});
