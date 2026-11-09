import Svg from 'react-native-svg';
import type { ChartSpec } from '@/content/types';
import { VB } from './scale';
import { BarChart } from './BarChart';
import { CandleChart } from './CandleChart';
import { CompoundingChart } from './CompoundingChart';
import { LineChart, type ChartTheme } from './LineChart';
import { PayoffChart } from './PayoffChart';

export type { ChartTheme } from './LineChart';

export interface ChartViewProps {
  spec: ChartSpec;
  theme: ChartTheme;
  /**
   * Entrance progress, 0..1. Omitted (or 1) renders the finished chart; a
   * running entrance reveals marks one after another — bars grow from the
   * axis, lines draw, candles appear in sequence — each ~60 ms behind the
   * last. The data is never changed, only how much of it is on screen yet.
   */
  progress?: number;
}

/**
 * Dispatches a ChartSpec to its renderer. The `never` guard means adding a
 * chart type to the schema is a compile error here — schema and renderer
 * cannot silently drift apart.
 */
export function ChartView({ spec, theme, progress = 1 }: ChartViewProps) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VB.width} ${VB.height}`}>
      {renderChart(spec, theme, progress)}
    </Svg>
  );
}

function renderChart(spec: ChartSpec, theme: ChartTheme, progress: number) {
  switch (spec.type) {
    case 'line':
      return <LineChart spec={spec} theme={theme} progress={progress} />;
    case 'candles':
      return <CandleChart spec={spec} theme={theme} progress={progress} />;
    case 'bars':
      return <BarChart spec={spec} theme={theme} progress={progress} />;
    case 'compounding':
      return <CompoundingChart spec={spec} theme={theme} progress={progress} />;
    case 'payoff':
      return <PayoffChart spec={spec} theme={theme} progress={progress} />;
    default: {
      const exhaustive: never = spec;
      return exhaustive;
    }
  }
}
