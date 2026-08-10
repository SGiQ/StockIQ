# stockiq-market

Proxies Finnhub quotes so the API key never ships in the app bundle. Same
pattern as `../ask`.

## Deploy

```bash
cd workers/market
npm install
npx wrangler secret put FINNHUB_API_KEY   # paste your Finnhub key when prompted
# optional per-caller cap (fails open if omitted):
#   npx wrangler kv namespace create RATE_LIMIT   # paste id into wrangler.toml
npm run deploy
```

Then point the app at it:

```
EXPO_PUBLIC_MARKET_URL=https://stockiq-market.<your-subdomain>.workers.dev
```

## API

- `GET /health` → `{ ok: true }`
- `GET /v1/quotes?symbols=AAPL,MSFT` (header `x-device-id`) →
  `{ quotes: [{ symbol, price, change, changePercent, previousClose, valid }] }`
