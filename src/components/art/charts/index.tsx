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
}

/**
 * Dispatches a ChartSpec to its renderer. The `never` guard means adding a
 * chart type to the schema is a compile error here — schema and renderer
 * cannot silently drift apart.
 */
export function ChartView({ spec, theme }: ChartViewProps) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VB.width} ${VB.height}`}>
      {renderChart(spec, theme)}
    </Svg>
  );
}

function renderChart(spec: ChartSpec, theme: ChartTheme) {
  switch (spec.type) {
    case 'line':
      return <LineChart spec={spec} theme={theme} />;
    case 'candles':
      return <CandleChart spec={spec} theme={theme} />;
    case 'bars':
      return <BarChart spec={spec} theme={theme} />;
    case 'compounding':
      return <CompoundingChart spec={spec} theme={theme} />;
    case 'payoff':
      return <PayoffChart spec={spec} theme={theme} />;
    default: {
      const exhaustive: never = spec;
      return exhaustive;
    }
  }
}
