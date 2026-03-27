export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$',   name: 'US Dollar' },
  { code: 'EUR', symbol: '€',   name: 'Euro' },
  { code: 'GBP', symbol: '£',   name: 'British Pound' },
  { code: 'PKR', symbol: '₨',   name: 'Pakistani Rupee' },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼',   name: 'Saudi Riyal' },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥',   name: 'Chinese Yuan' },
  { code: 'CHF', symbol: 'Fr',  name: 'Swiss Franc' },
  { code: 'MYR', symbol: 'RM',  name: 'Malaysian Ringgit' },
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar' },
];

const NO_DECIMAL = new Set(['JPY']);

export const getSymbol = (code: string): string =>
  CURRENCIES.find(c => c.code === code)?.symbol ?? code;

export const formatAmount = (amount: number, code: string): string => {
  const symbol = getSymbol(code);
  const value = NO_DECIMAL.has(code)
    ? Math.round(amount).toString()
    : amount.toFixed(2);
  return `${symbol}${value}`;
};

export const CURRENCY_ICONS: Record<string, string> = {
  USD: 'currency-usd',
  EUR: 'currency-eur',
  GBP: 'currency-gbp',
  INR: 'currency-inr',
  JPY: 'currency-jpy',
  CNY: 'currency-cny',
};

export const getCurrencyIcon = (code: string): string =>
  CURRENCY_ICONS[code] ?? 'cash';
