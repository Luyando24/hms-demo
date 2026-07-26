// Currency utility & formatting module

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  position: 'prefix' | 'suffix';
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', position: 'prefix' },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'K', position: 'prefix' },
  { code: 'EUR', name: 'Euro', symbol: '€', position: 'prefix' },
  { code: 'GBP', name: 'British Pound', symbol: '£', position: 'prefix' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', position: 'prefix' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', position: 'prefix' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', position: 'prefix' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', position: 'prefix' },
];

export function formatCurrencyAmount(
  amount: number | string | null | undefined, 
  symbol: string = '$', 
  position: 'prefix' | 'suffix' = 'prefix'
): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount as string) || 0;
  const formattedNum = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  if (position === 'suffix') {
    return `${formattedNum} ${symbol}`;
  }
  return `${symbol}${formattedNum}`;
}
