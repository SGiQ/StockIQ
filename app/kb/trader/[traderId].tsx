import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getTrader } from '@/content/registry';
import type { EntityRef } from '@/content/types';
import { RichTextView, Screen, Text } from '@/components/primitives';
import {
  BulletBlock,
  EntityDetail,
  SourceCite,
  SourcedRows,
} from '@/components/kb/EntityScaffold';
import { RefChips, bookRefs, strategyRefs, traderRefs } from '@/components/kb/RefChips';
import { palette, radius, space } from '@/theme/tokens';

export default function TraderDetail() {
  const { traderId } = useLocalSearchParams<{ traderId: string }>();
  const trader = getTrader(traderId);

  if (!trader) {
    return (
      <Screen tone="warm">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="h2">Trader not found</Text>
        </View>
      </Screen>
    );
  }

  return (
    <EntityDetail
      eyebrow={trader.era}
      title={trader.name}
      entityRef={`trader:${trader.id}` as EntityRef}
      hero={trader.portrait}
      oneLiner={trader.oneLiner}
    >
      <RichTextView value={trader.bio} variant="body" color={palette.inkSoft} linksEnabled />

      <BulletBlock title="How they thought" items={trader.philosophy} />

      {trader.trackRecord && trader.trackRecord.length > 0 && (
        <SourcedRows title="Track record" rows={trader.trackRecord} />
      )}

      {trader.famousTrades && trader.famousTrades.length > 0 && (
        <View style={{ gap: space.md }}>
          <Text variant="label" color={palette.slate} uppercase>
            Famous trades
          </Text>
          {trader.famousTrades.map((trade, index) => (
            <View
              key={index}
              style={{
                backgroundColor: palette.paper,
                borderRadius: radius.md,
                padding: space.md,
                gap: space.xs,
              }}
            >
              <Text variant="bodyEm" color={palette.ink}>
                {trade.year ? `${trade.title} (${trade.year})` : trade.title}
              </Text>
              <RichTextView value={trade.story} variant="bodySm" color={palette.inkSoft} />
              <SourceCite source={trade.source} url={trade.sourceUrl} />
            </View>
          ))}
        </View>
      )}

      <View style={{ gap: space.md }}>
        <Text variant="label" color={palette.slate} uppercase>
          In their words
        </Text>
        {trader.quotes.map((quote, index) => (
          <View
            key={index}
            style={{
              borderLeftWidth: 3,
              borderLeftColor: palette.mint,
              paddingLeft: space.md,
              gap: space.xxs,
            }}
          >
            <Text variant="insight" color={palette.ink}>
              {quote.text}
            </Text>
            {quote.context && (
              <Text variant="caption" color={palette.slate}>
                {quote.context}
              </Text>
            )}
          </View>
        ))}
      </View>

      <RefChips title="Signature strategies" refs={strategyRefs(trader.signatureStrategies)} />
      <RefChips title="Recommended reading" refs={bookRefs(trader.recommendedReading)} />
      <RefChips title="See also" refs={traderRefs(trader.relatedTraders ?? [])} />
    </EntityDetail>
  );
}
