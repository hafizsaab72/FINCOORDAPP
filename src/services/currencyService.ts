import { useStore } from '../store/useStore';

const RATES_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

export async function fetchExchangeRates(): Promise<void> {
  const { ratesLastFetched, setExchangeRates } = useStore.getState();
  if (Date.now() - ratesLastFetched < RATES_TTL_MS) return; // still fresh

  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    if (data?.rates) {
      setExchangeRates(data.rates as Record<string, number>);
    }
  } catch {
    // silently fail — app works without live rates
  }
}

/**
 * Convert amount from one currency to another using cached rates (USD base).
 * Returns null if rates aren't loaded yet.
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number | null {
  if (!rates || Object.keys(rates).length === 0) return null;
  if (from === to) return amount;

  const fromRate = from === 'USD' ? 1 : rates[from];
  const toRate = to === 'USD' ? 1 : rates[to];

  if (!fromRate || !toRate) return null;

  // Convert to USD first, then to target
  const usd = amount / fromRate;
  return usd * toRate;
}
