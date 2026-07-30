import type { Card, ChartSpec } from '@/content/types';
import { toPlainText } from '@/content/richtext';

/**
 * Serialises the current card into compact text for the tutor's context.
 *
 * Two deliberate choices:
 *   - Charts are described rather than rendered. The card's visual IS the
 *     concept for a `diagram`, so a tutor that could not see it would be
 *     answering blind.
 *   - Quiz cards include the correct answer and the explanation. The learner
 *     has already committed by the time they can ask, and the useful question
 *     is "why", which the tutor cannot answer without knowing the answer.
 */
export function describeCard(card: Card): string {
  const lines: string[] = [`Card type: ${card.type}`];

  switch (card.type) {
    case 'concept':
      lines.push(`Headline: ${toPlainText(card.headline)}`);
      lines.push(`Body: ${toPlainText(card.body)}`);
      if (card.art) lines.push(`Visual: ${describeArt(card.art)}`);
      break;

    case 'diagram':
      if (card.title) lines.push(`Title: ${card.title}`);
      lines.push(`Visual: ${describeArt(card.art)}`);
      lines.push(`Caption: ${toPlainText(card.caption)}`);
      break;

    case 'sticker_reveal':
      lines.push(`Body: ${toPlainText(card.body)}`);
      lines.push(`Labels revealed: ${card.stickers.map((s) => s.label).join(', ')}`);
      break;

    case 'binary_choice': {
      const correct = card.options.find((o) => o.correct);
      lines.push(`Question: ${toPlainText(card.prompt)}`);
      lines.push(`Options: ${card.options.map((o) => o.label).join(' / ')}`);
      lines.push(`Correct answer: ${correct?.label ?? 'unknown'}`);
      lines.push(`Explanation shown: ${toPlainText(card.explanation)}`);
      break;
    }

    case 'fill_blank':
      lines.push(`Sentence: ${toPlainText(card.body)}`);
      lines.push(`Word bank: ${card.wordBank.join(', ')}`);
      lines.push(`Correct answer: ${card.answer}`);
      if (card.explanation) lines.push(`Explanation shown: ${toPlainText(card.explanation)}`);
      break;

    case 'main_idea':
      lines.push(`Recap: ${toPlainText(card.summary)}`);
      lines.push(...card.bullets.map((b, i) => `Point ${i + 1}: ${toPlainText(b)}`));
      break;

    case 'key_insight':
      lines.push(`Insight: ${card.insight}`);
      if (card.attribution) lines.push(`Attributed to: ${card.attribution.source}`);
      break;
  }

  return lines.join('\n');
}

function describeArt(art: { kind: string } & Record<string, unknown>): string {
  if (art.kind === 'glyph') return `a ${String(art.name)} icon`;
  if (art.kind === 'palette') return 'a plain coloured panel';
  if (art.kind === 'image') return String(art.alt ?? 'an image');
  if (art.kind === 'chart') return describeChart(art.spec as ChartSpec);
  return 'a visual';
}

/** Charts are numbers, so they describe losslessly in a sentence. */
function describeChart(spec: ChartSpec): string {
  switch (spec.type) {
    case 'line': {
      const parts = [`a line chart of the series [${spec.series.join(', ')}]`];
      if (spec.compareSeries) {
        parts.push(
          `compared against [${spec.compareSeries.join(', ')}]${
            spec.compareLabel ? ` ("${spec.compareLabel}")` : ''
          }`,
        );
      }
      if (spec.yLabel) parts.push(`y-axis "${spec.yLabel}"`);
      if (spec.xLabels) parts.push(`x-axis ${spec.xLabels.join(', ')}`);
      if (spec.shadeLabel) parts.push(`with the region "${spec.shadeLabel}" shaded`);
      if (spec.markers?.length) {
        parts.push(`markers at ${spec.markers.map((m) => m.label).join(', ')}`);
      }
      return parts.join('; ');
    }
    case 'bars':
      return `a bar chart: ${spec.labels
        .map((l, i) => `${l} = ${spec.values[i]}`)
        .join(', ')}${spec.yLabel ? ` (y-axis "${spec.yLabel}")` : ''}`;
    case 'candles': {
      const levels = spec.levels?.map((l) => `${l.label} at ${l.value}`).join(', ');
      return `a candlestick chart of ${spec.candles.length} candles${
        levels ? `, with reference levels: ${levels}` : ''
      }`;
    }
    case 'compounding':
      return `a compounding curve: ${spec.principal} growing at ${Math.round(
        spec.rate * 100,
      )}% for ${spec.years} years${
        spec.compareRate !== undefined
          ? `, compared against ${Math.round(spec.compareRate * 100)}%`
          : ''
      }`;
    case 'payoff':
      return `an expiry payoff diagram for ${spec.legs
        .map((l) => `${l.side} ${l.kind}${l.strike ? ` at ${l.strike}` : ''}`)
        .join(' + ')}`;
  }
}
