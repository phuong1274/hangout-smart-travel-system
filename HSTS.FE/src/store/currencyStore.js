import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  CURRENCY_OPTIONS,
  loadBackendCurrencyRates,
  normalizeCurrencyCode,
} from '@/features/trip/constants/currency';

export const useCurrencyStore = create(
  persist(
    (set, get) => ({
      currencyCode: 'VND',
      ratesLoaded: false,
      ratesLoading: false,

      setCurrencyCode: (currencyCode) => {
        const normalizedCurrency = normalizeCurrencyCode(currencyCode, get().currencyCode);
        set({ currencyCode: normalizedCurrency });
      },

      loadRates: async () => {
        if (get().ratesLoaded || get().ratesLoading) return;

        set({ ratesLoading: true });
        try {
          await loadBackendCurrencyRates();
          set({ ratesLoaded: true, ratesLoading: false });
        } catch {
          set({ ratesLoading: false });
        }
      },
    }),
    {
      name: 'currency-preference-storage',
      partialize: (state) => ({ currencyCode: state.currencyCode }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const supportedCodes = new Set(CURRENCY_OPTIONS.map((option) => option.value));
        if (!supportedCodes.has(state.currencyCode)) {
          state.setCurrencyCode('VND');
        }
      },
    },
  ),
);
