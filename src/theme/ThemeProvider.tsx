import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { palette } from './tokens';

export type Palette = { [K in keyof typeof palette]: string };

const darkPalette: Palette = {
  forest: '#2E8B6B',
  forestDeep: '#1D5E4A',
  forestInk: '#A8E6CF',

  mint: '#00E5A0',
  mintSoft: '#A8E6A3',

  ink: '#F5F5F3',
  inkSoft: '#D4D4D2',
  paper: '#1C1C1E',
  paperWarm: '#141416',
  slate: '#98989D',
  slateLight: '#636366',
  hairline: '#38383A',

  violet: '#A78BFA',
  violetSoft: '#2D2250',
  violetInk: '#C4B5FD',

  azure: '#60A5FA',
  azureSoft: '#1E3A5F',

  emerald: '#4ADE80',
  emeraldDeep: '#22A55B',
  flame: '#FB923C',
  flameSoft: '#7C2D12',

  danger: '#EF4444',
  dangerSoft: '#450A0A',
  terracotta: '#E07A5F',
  success: '#22C55E',
  successSoft: '#14532D',

  askFrom: '#D98AED',
  askTo: '#F5B77A',
};

interface ThemeValue {
  colors: Palette;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeValue>({
  colors: palette as Palette,
  isDark: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const value = useMemo<ThemeValue>(() => {
    const isDark = scheme === 'dark';
    return { colors: isDark ? darkPalette : (palette as Palette), isDark };
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useColors(): Palette {
  return useContext(ThemeContext).colors;
}

export function useIsDark(): boolean {
  return useContext(ThemeContext).isDark;
}
