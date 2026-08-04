import type { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import type { ArtSpec, EntityRef } from '@/content/types';
import { ArtView } from '@/components/art/ArtView';
import { RichTextView, Screen, Text } from '@/components/primitives';
import { useAppStore } from '@/store/slices/useAppStore';
import { palette, radius, space } from '@/theme/tokens';

/** Shared back chrome for every knowledge-base detail screen. */
export function EntityHeader({
  eyebrow,
  title,
  entityRef,
}: {
  eyebrow: string;
  title: string;
  entityRef: EntityRef;
}) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/kb'))}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Path
            d="M15 5l-7 7 7 7"
            stroke={palette.ink}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Pressable>
      <View style={styles.headerText}>
        <Text variant="label" color={palette.slate} uppercase>
          {eyebrow}
        </Text>
        <Text variant="h3" color={palette.ink} numberOfLines={2}>
          {title}
        </Text>
      </View>
      <LikeButton entityRef={entityRef} />
    </View>
  );
}

function LikeButton({ entityRef }: { entityRef: EntityRef }) {
  // Subscribe to the liked list, not to the store's helper method — the
  // method reference is stable and would never re-render this button.
  const liked = useAppStore((s) => s.liked);
  const toggle = useAppStore((s) => s.toggleLiked);
  const isLiked = liked.some((l) => l.ref === entityRef);

  return (
    <Pressable
      onPress={() => void toggle(entityRef)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
      accessibilityState={{ selected: isLiked }}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path
          d="M12 20.5C6.5 16.8 3 13.9 3 9.9A4.9 4.9 0 017.9 5c1.7 0 3.2.8 4.1 2.1A5 5 0 0116.1 5 4.9 4.9 0 0121 9.9c0 4-3.5 6.9-9 10.6z"
          fill={isLiked ? palette.danger : 'none'}
          stroke={isLiked ? palette.danger : palette.ink}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

export interface EntityDetailProps {
  eyebrow: string;
  title: string;
  /** Powers the like button in the header. */
  entityRef: EntityRef;
  hero?: ArtSpec;
  oneLiner?: string;
  children: ReactNode;
  /** Strategy screens carry the not-advice notice; others do not need it. */
  showAdviceNotice?: boolean;
}

export function EntityDetail({
  eyebrow,
  title,
  entityRef,
  hero,
  oneLiner,
  children,
  showAdviceNotice = false,
}: EntityDetailProps) {
  return (
    <Screen tone="warm">
      <EntityHeader eyebrow={eyebrow} title={title} entityRef={entityRef} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {hero && (
          <View style={styles.hero}>
            <ArtView spec={hero} aspectRatio={1.6} glyphSize={72} />
          </View>
        )}

        {oneLiner && (
          <Text variant="h2" color={palette.ink}>
            {oneLiner}
          </Text>
        )}

        {children}

        {showAdviceNotice && (
          <View style={styles.notice}>
            <Text variant="caption" color={palette.slate}>
              This describes how an approach has been practised and written about. It is
              educational only — not a recommendation, and not personalised advice.
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

/** A titled block of prose bullets, used for philosophy and rule lists. */
export function BulletBlock({
  title,
  items,
  tone = palette.mint,
}: {
  title: string;
  items: string[];
  tone?: string;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.block}>
      <Text variant="label" color={palette.slate} uppercase>
        {title}
      </Text>
      {items.map((item, index) => (
        <View key={index} style={styles.bullet}>
          <View style={[styles.dot, { backgroundColor: tone }]} />
          <RichTextView
            value={item}
            variant="body"
            color={palette.inkSoft}
            linksEnabled
            style={styles.bulletText}
          />
        </View>
      ))}
    </View>
  );
}

/** Key/value rows with a required source line — used for track records. */
/**
 * The "Source: …" line under a claim about a real person. Tappable when a
 * primary source is genuinely online; plain text otherwise (a book, a print
 * interview) — the citation text is always shown either way.
 */
export function SourceCite({ source, url }: { source: string; url?: string }) {
  if (!url) {
    return (
      <Text variant="caption" color={palette.slateLight}>
        {`Source: ${source}`}
      </Text>
    );
  }
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      accessibilityRole="link"
      accessibilityLabel={`Source: ${source}`}
    >
      <Text variant="caption" color={palette.azure} style={styles.sourceLink}>
        {`Source: ${source}`}
      </Text>
    </Pressable>
  );
}

export function SourcedRows({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ metric: string; value: string; note?: string; source: string; sourceUrl?: string }>;
}) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.block}>
      <Text variant="label" color={palette.slate} uppercase>
        {title}
      </Text>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.rowTop}>
            <Text variant="bodyEm" color={palette.ink} style={styles.rowMetric}>
              {row.metric}
            </Text>
            <Text variant="bodyEm" color={palette.forestDeep}>
              {row.value}
            </Text>
          </View>
          {row.note && (
            <Text variant="caption" color={palette.slate}>
              {row.note}
            </Text>
          )}
          {/*
            The source is always shown, never collapsed. These are claims
            about real people, and an unsourced performance figure on screen
            is exactly what the schema's required `source` field exists to
            prevent.
          */}
          <SourceCite source={row.source} url={row.sourceUrl} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  headerText: {
    flex: 1,
    gap: space.xxs,
  },
  body: {
    padding: space.lg,
    gap: space.xl,
    paddingBottom: space.xxl,
  },
  hero: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  block: {
    gap: space.sm,
  },
  bullet: {
    flexDirection: 'row',
    gap: space.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 11,
  },
  bulletText: {
    flex: 1,
  },
  row: {
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xxs,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  rowMetric: {
    flex: 1,
  },
  sourceLink: {
    textDecorationLine: 'underline',
  },
  notice: {
    backgroundColor: palette.violetSoft,
    borderRadius: radius.md,
    padding: space.md,
  },
});
