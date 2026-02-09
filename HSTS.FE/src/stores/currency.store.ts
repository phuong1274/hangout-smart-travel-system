import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CurrencyCode = 'VND' | 'USD' | 'EUR' | 'JPY' | 'KRW' | 'THB';

interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  locale: string;
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  VND: { code: 'VND', symbol: '₫', locale: 'vi-VN', decimals: 0 },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', locale: 'ja-JP', decimals: 0 },
  KRW: { code: 'KRW', symbol: '₩', locale: 'ko-KR', decimals: 0 },
  THB: { code: 'THB', symbol: '฿', locale: 'th-TH', decimals: 2 },
};

// Static exchange rates (base: USD)
// In production, fetch from API and update periodically
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  VND: 25_400,
  EUR: 0.92,
  JPY: 154.5,
  KRW: 1_380,
  THB: 35.8,
};

interface CurrencyState {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  convert: (amount: number, from: CurrencyCode, to?: CurrencyCode) => number;
  format: (amount: number, currencyCode?: CurrencyCode) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'VND',

      setCurrency: (currency) => set({ currency }),

      convert: (amount, from, to?) => {
        const target = to ?? get().currency;
        if (from === target) return amount;
        const amountInUSD = amount / EXCHANGE_RATES[from];
        return amountInUSD * EXCHANGE_RATES[target];
      },

      format: (amount, currencyCode?) => {
        const code = currencyCode ?? get().currency;
        const config = CURRENCIES[code];
        return new Intl.NumberFormat(config.locale, {
          style: 'currency',
          currency: code,
          minimumFractionDigits: config.decimals,
          maximumFractionDigits: config.decimals,
        }).format(amount);
      },
    }),
    {
      name: 'currency-storage',
    },
  ),
);
