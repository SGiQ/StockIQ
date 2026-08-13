import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { radius, shadow, space } from '@/theme/tokens';
import { useColors, useIsDark } from '@/theme/ThemeProvider';

export type SurfaceTone = 'paper' | 'warm' | 'forest' | 'forestDeep' | 'ink';

/** Whether text on this surface should be light. */
export const isDarkTone = (tone: SurfaceTone): boolean =>
  tone === 'forest' || tone === 'forestDeep' || tone === 'ink';

function useTones() {
  const c = useColors();
  return {
    paper: c.paper,
    warm: c.paperWarm,
    forest: c.forest,
    forestDeep: c.forestDeep,
    ink: c.ink,
  } as Record<SurfaceTone, string>;
}

export interface ScreenProps {
  tone?: SurfaceTone;
  edges?: Edge[];
  children: ReactNode;
  style?: ViewStyle;
}

/** Full-screen background with safe-area insets applied. */
export function Screen({ tone = 'warm', edges = ['top', 'bottom'], children, style }: ScreenProps) {
  const tones = useTones();
  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: tones[tone] }, style]}>
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
  const tones = useTones();
  const isDark = useIsDark();
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: tones[tone] },
        isDark ? { borderWidth: 1, borderColor: colors.hairline } : null,
        padded ? { padding: space.md } : null,
        elevated && !isDark ? shadow.card : null,
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
