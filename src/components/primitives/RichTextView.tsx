import { useMemo } from 'react';
import { Text as RNText, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { parseRichText } from '@/content/richtext';
import { resolveRef } from '@/content/registry';
import { fontFamily, type, type TypeVariant } from '@/theme/tokens';
import { useColors } from '@/theme/ThemeProvider';

export interface RichTextViewProps {
  value: string;
  variant?: TypeVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  /**
   * What to draw where a [[1]] slot appears. The fill_blank card passes its
   * current selection; everywhere else a blank should not occur at all.
   */
  renderBlank?: (slot: number) => React.ReactNode;
  /** Cross-links are inert inside the player, tappable in the knowledge base. */
  linksEnabled?: boolean;
  style?: TextStyle;
}

/**
 * Renders the three-construct RichText grammar. Parsing is memoised on the
 * raw string because card bodies re-render on every gesture frame while a
 * swipe is in flight.
 */
export function RichTextView({
  value,
  variant = 'body',
  color,
  align,
  renderBlank,
  linksEnabled = false,
  style,
}: RichTextViewProps) {
  const router = useRouter();
  const colors = useColors();
  const resolvedColor = color ?? colors.ink;
  const parsed = useMemo(() => parseRichText(value), [value]);

  return (
    <RNText style={[type[variant], { color: resolvedColor }, align ? { textAlign: align } : null, style]}>
      {parsed.nodes.map((node, index) => {
        switch (node.kind) {
          case 'text':
            return <RNText key={index}>{node.text}</RNText>;

          case 'bold':
            return (
              <RNText key={index} style={{ fontFamily: fontFamily.bodySemi }}>
                {node.text}
              </RNText>
            );

          case 'blank':
            return <RNText key={index}>{renderBlank?.(node.slot) ?? '———'}</RNText>;

          case 'link': {
            const resolved = resolveRef(node.ref);
            if (!resolved) return <RNText key={index}>{node.text}</RNText>;
            return (
              <RNText
                key={index}
                style={{
                  fontFamily: fontFamily.bodySemi,
                  color: linksEnabled ? colors.azure : resolvedColor,
                  textDecorationLine: linksEnabled ? 'underline' : 'none',
                }}
                onPress={linksEnabled ? () => router.push(resolved.href as never) : undefined}
              >
                {node.text}
              </RNText>
            );
          }
        }
      })}
    </RNText>
  );
}
