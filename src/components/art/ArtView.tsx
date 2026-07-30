import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import type { ArtSpec, PalettePreset } from '@/content/types';
import { artPalettes, radius } from '@/theme/tokens';
import { ChartView, type ChartTheme } from './charts';
import { Glyph } from './Glyph';

export interface ArtViewProps {
  spec: ArtSpec;
  /** Square by default; diagrams pass a taller ratio. */
  aspectRatio?: number;
  rounded?: boolean;
  style?: ViewStyle;
  glyphSize?: number;
}

export const themeFor = (preset: PalettePreset): ChartTheme => {
  const p = artPalettes[preset];
  return { bg: p.bg, ink: p.ink, accent: p.accent };
};

/**
 * Renders any ArtSpec.
 *
 * Charts and glyphs both sit on a flat pastel panel and inherit that
 * panel's ink colour, which is what makes a compounding curve and a
 * lightbulb icon look like they came from the same hand.
 */
export function ArtView({
  spec,
  aspectRatio = 1,
  rounded = true,
  style,
  glyphSize = 64,
}: ArtViewProps) {
  const container: ViewStyle[] = [
    styles.base,
    { aspectRatio },
    rounded ? { borderRadius: radius.lg } : null,
    style,
  ].filter(Boolean) as ViewStyle[];

  switch (spec.kind) {
    case 'palette': {
      const p = artPalettes[spec.preset];
      return <View style={[...container, { backgroundColor: p.bg }]} />;
    }

    case 'glyph': {
      const p = artPalettes[spec.bg];
      return (
        <View style={[...container, styles.centred, { backgroundColor: p.bg }]}>
          <Glyph name={spec.name} size={glyphSize} color={p.ink} />
        </View>
      );
    }

    case 'chart': {
      // Charts carry their own palette: the profit/payoff family reads best
      // on the high-voltage green, everything else on a calm pastel.
      const preset: PalettePreset =
        spec.spec.type === 'payoff' ? 'neon' : spec.spec.type === 'candles' ? 'ink' : 'sky';
      const p = artPalettes[preset];
      return (
        <View style={[...container, styles.chart, { backgroundColor: p.bg }]}>
          <ChartView spec={spec.spec} theme={themeFor(preset)} />
        </View>
      );
    }

    case 'image':
      return (
        <View style={[...container, styles.centred]}>
          <Image
            source={{ uri: spec.source }}
            accessibilityLabel={spec.alt}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
        </View>
      );

    default: {
      const exhaustive: never = spec;
      return exhaustive;
    }
  }
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    overflow: 'hidden',
  },
  centred: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    padding: 8,
  },
});
