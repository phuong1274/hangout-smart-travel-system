import { useCurrencyStore } from '@/stores/currency.store';
import type { CurrencyCode } from '@/stores/currency.store';

/**
 * Hook to format and convert currency values.
 *
 * Usage:
 *   const { format, convert, currency } = useCurrency();
 *   format(500000)                    // "₫500,000" (in current currency)
 *   format(25, 'USD')                 // "$25.00"
 *   convert(25, 'USD')                // 635,000 (converted to current currency)
 *   convert(25, 'USD', 'EUR')         // 23 (USD -> EUR)
 */
export const useCurrency = () => {
  const { currency, setCurrency, convert, format } = useCurrencyStore();

  const formatConverted = (amount: number, from: CurrencyCode) => {
    const converted = convert(amount, from);
    return format(converted);
  };

  return {
    currency,
    setCurrency,
    convert,
    format,
    formatConverted,
  };
};
