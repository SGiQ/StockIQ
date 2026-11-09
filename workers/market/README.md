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
- `GET /v1/quotes?symbols=AAPL,MSFT` (header `x-device-id`, 16–128 chars) →
  `{ quotes: [{ symbol, price, change, changePercent, previousClose, valid, asOf, updatedAt? }] }`
  - `asOf` is `"delayed"` for a current print, or `"last_close"` when the price
    is the previous session's close (market closed, or Finnhub sent `c: 0` with
    a `pc`). The app labels last-close prices; never render one unlabelled.
  - `valid: false` means Finnhub has no data for the symbol (all zeros).

## Errors

| Status | Body | Cause |
|---|---|---|
| 400 | `X-Device-Id header is required` / `symbols is required` | Bad request |
| 429 | `daily quote limit reached` / `Finnhub rate limit reached` | Cap or free tier |
| 500 | `proxy is not configured` | `FINNHUB_API_KEY` secret never set |
| 502 | `market key rejected by Finnhub…`, `upstream: 401` | Key dead or rotated — issue a new one and `secret put` it |
| 502 | `market data is unavailable` | Finnhub outage |

Only when **every** requested symbol fails does the request fail; a partial
result returns 200 with the symbols that succeeded.
