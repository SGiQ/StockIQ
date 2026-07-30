import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { palette, radius, shadow, space } from '@/theme/tokens';

export type SurfaceTone = 'paper' | 'warm' | 'forest' | 'forestDeep' | 'ink';

const TONES: Record<SurfaceTone, string> = {
  paper: palette.paper,
  warm: palette.paperWarm,
  forest: palette.forest,
  forestDeep: palette.forestDeep,
  ink: palette.ink,
};

/** Whether text on this surface should be light. */
export const isDarkTone = (tone: SurfaceTone): boolean =>
  tone === 'forest' || tone === 'forestDeep' || tone === 'ink';

export interface ScreenProps {
  tone?: SurfaceTone;
  edges?: Edge[];
  children: ReactNode;
  style?: ViewStyle;
}

/** Full-screen background with safe-area insets applied. */
export function Screen({ tone = 'warm', edges = ['top', 'bottom'], children, style }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: TONES[tone] }, style]}>
      {children}
    </SafeAreaView>
  );
}

export interface CardSurfaceProps {
  children: ReactNode;
  tone?: SurfaceTone;
  padded?: boolean;
  elevated?: boolean;
  style?: ViewStyle;
}

/** The white rounded container used for course rows and content cards. */
export function CardSurface({
  children,
  tone = 'paper',
  padded = true,
  elevated = true,
  style,
}: CardSurfaceProps) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: TONES[tone] },
        padded ? { padding: space.md } : null,
        elevated ? shadow.card : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  card: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
});
