import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PaperTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  shares: number;
  price: number;
  total: number;
  timestamp: number;
}

const KEY = 'stockiq:paper-trades:v1';
const MAX_TRADES = 200;

export async function getTrades(): Promise<PaperTrade[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PaperTrade[];
  } catch {
    return [];
  }
}

export async function recordTrade(
  symbol: string,
  side: 'buy' | 'sell',
  shares: number,
  price: number,
): Promise<PaperTrade> {
  const trade: PaperTrade = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    symbol,
    side,
    shares,
    price,
    total: Math.round(shares * price * 100) / 100,
    timestamp: Date.now(),
  };
  const existing = await getTrades();
  const updated = [trade, ...existing].slice(0, MAX_TRADES);
  await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  return trade;
}

export async function clearTrades(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
