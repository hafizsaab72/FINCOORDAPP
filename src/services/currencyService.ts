import { useStore } from '../store/useStore';
import { apiFetch } from './api';

const RATES_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function fetchExchangeRates(): Promise<void> {
  const { ratesLastFetched, setExchangeRates } = useStore.getState();
  if (Date.now() - ratesLastFetched < RATES_TTL_MS) return; // still fresh

  try {
    const data = await apiFetch<{ base: string; rates: Record<string, number> }>('/currency/rates');
    if (data?.rates) {
      setExchangeRates(data.rates);
    }
  } catch {
    // Fallback to direct API if backend is unreachable
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const fallback = await res.json();
      if (fallback?.rates) {
        setExchangeRates(fallback.rates as Record<string, number>);
      }
    } catch {
      // silently fail — app works without live rates
    }
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
